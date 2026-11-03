import { Router } from "express";
import type { Filter, Sort } from "mongodb";
import { ObjectId } from "mongodb";
import { isFutureDate, todayString } from "../dates.js";
import { events, joinedEvents, type EventDoc } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { EVENT_TYPES, eventSchema, formatIssues } from "../validation.js";

export const eventsRouter = Router();

const MAX_LIST_SIZE = 200;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function parseId(raw: string | string[] | undefined): ObjectId | null {
    return typeof raw === "string" && ObjectId.isValid(raw) ? new ObjectId(raw) : null;
  }

/**
 * GET /api/events  (public)
 * Only upcoming events are returned: anything dated before today never leaves the database query.
 * Query: search, type, sort (soonest | latest), limit
 */
eventsRouter.get("/events", async (req, res) => {
  const { search, type, sort, limit } = req.query;

  const filter: Filter<EventDoc> = { eventDate: { $gte: todayString() } };

  if (typeof type === "string" && (EVENT_TYPES as readonly string[]).includes(type)) {
    filter.eventType = type;
  }

  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim().slice(0, 60)), "i");
    filter.$or = [{ title: pattern }, { location: pattern }];
  }

  const order: Sort =
    sort === "latest" ? { eventDate: -1, createdAt: -1 } : { eventDate: 1, createdAt: 1 };

  const requested = Number(limit);
  const size = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_LIST_SIZE) : MAX_LIST_SIZE;

  const list = await events.find(filter).sort(order).limit(size).toArray();
  res.json(list);
});

/** GET /api/events/:id  (public) - the details page is open to everyone, even for past events. */
eventsRouter.get("/events/:id", async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "That event link is not valid" });
    return;
  }

  const event = await events.findOne({ _id });
  if (!event) {
    res.status(404).json({ message: "We could not find that event. It may have been removed" });
    return;
  }
  res.json(event);
});

/** POST /api/events  (private) - the creator's identity always comes from the verified token. */
eventsRouter.post("/events", requireAuth, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Please fix the highlighted fields", errors: formatIssues(parsed.error) });
    return;
  }

  if (!isFutureDate(parsed.data.eventDate)) {
    res.status(400).json({
      message: "Please fix the highlighted fields",
      errors: { eventDate: "Event date must be in the future" },
    });
    return;
  }

  const user = req.user!;
  const now = new Date();
  const doc: EventDoc = {
    ...parsed.data,
    creatorEmail: user.email,
    creatorName: user.name,
    participantCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await events.insertOne(doc);
  res.status(201).json({ message: "Event created successfully", eventId: result.insertedId });
});

/** GET /api/my-events  (private) - events created by the logged-in user. */
eventsRouter.get("/my-events", requireAuth, async (req, res) => {
  const mine = await events
    .find({ creatorEmail: req.user!.email })
    .sort({ eventDate: 1, createdAt: 1 })
    .limit(MAX_LIST_SIZE)
    .toArray();
  res.json(mine);
});

/** PUT /api/events/:id  (private, owner only) */
eventsRouter.put("/events/:id", requireAuth, async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "That event link is not valid" });
    return;
  }

  const existing = await events.findOne({ _id });
  if (!existing) {
    res.status(404).json({ message: "We could not find that event. It may have been removed" });
    return;
  }
  if (existing.creatorEmail !== req.user!.email) {
    res.status(403).json({ message: "You can only update events that you created" });
    return;
  }

  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Please fix the highlighted fields", errors: formatIssues(parsed.error) });
    return;
  }

  // Keeping the original date is fine (for example, fixing a typo on the day itself). Moving it needs a future date.
  const dateChanged = parsed.data.eventDate !== existing.eventDate;
  if (dateChanged && !isFutureDate(parsed.data.eventDate)) {
    res.status(400).json({
      message: "Please fix the highlighted fields",
      errors: { eventDate: "Event date must be in the future" },
    });
    return;
  }

  const { title, description, eventType, thumbnail, location, eventDate } = parsed.data;
  await events.updateOne(
    { _id },
    { $set: { title, description, eventType, thumbnail, location, eventDate, updatedAt: new Date() } },
  );

  // Joined events carry a copy of the event, so volunteers see the corrected details too.
  await joinedEvents.updateMany({ eventId: _id }, { $set: { title, thumbnail, eventType, location, eventDate } });

  res.json({ message: "Event updated successfully" });
});

/** DELETE /api/events/:id  (private, owner only) */
eventsRouter.delete("/events/:id", requireAuth, async (req, res) => {
  const _id = parseId(req.params.id);
  if (!_id) {
    res.status(400).json({ message: "That event link is not valid" });
    return;
  }

  const existing = await events.findOne({ _id });
  if (!existing) {
    res.status(404).json({ message: "We could not find that event. It may have been removed" });
    return;
  }
  if (existing.creatorEmail !== req.user!.email) {
    res.status(403).json({ message: "You can only delete events that you created" });
    return;
  }

  await events.deleteOne({ _id });
  await joinedEvents.deleteMany({ eventId: _id });

  res.json({ message: "Event deleted successfully" });
});
