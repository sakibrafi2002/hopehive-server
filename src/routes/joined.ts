import { Router } from "express";
import { ObjectId } from "mongodb";
import { isUpcoming } from "../dates.js";
import { events, isDuplicateKeyError, joinedEvents } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const joinedRouter = Router();

  function parseId(raw: string | string[] | undefined): ObjectId | null {
    return typeof raw === "string" && ObjectId.isValid(raw) ? new ObjectId(raw) : null;
  }

/** POST /api/events/:id/join  (private) - stores the event and user data together. */
joinedRouter.post("/events/:id/join", requireAuth, async (req, res) => {
  const eventId = parseId(req.params.id);
  if (!eventId) {
    res.status(400).json({ message: "That event link is not valid" });
    return;
  }

  const event = await events.findOne({ _id: eventId });
  if (!event) {
    res.status(404).json({ message: "We could not find that event. It may have been removed" });
    return;
  }

  if (!isUpcoming(event.eventDate)) {
    res.status(400).json({ message: "This event has already taken place, so it is closed for joining" });
    return;
  }

  const user = req.user!;
  try {
    await joinedEvents.insertOne({
      eventId,
      userEmail: user.email,
      userName: user.name,
      joinedAt: new Date(),
      title: event.title,
      thumbnail: event.thumbnail,
      eventType: event.eventType,
      location: event.location,
      eventDate: event.eventDate,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({ message: "You have already joined this event" });
      return;
    }
    throw error;
  }

  await events.updateOne({ _id: eventId }, { $inc: { participantCount: 1 } });
  res.status(201).json({ message: "You have joined this event. Thank you for showing up!" });
});

/** GET /api/events/:id/join-status  (private) - lets the details page show "Already Joined". */
joinedRouter.get("/events/:id/join-status", requireAuth, async (req, res) => {
  const eventId = parseId(req.params.id);
  if (!eventId) {
    res.status(400).json({ message: "That event link is not valid" });
    return;
  }

  const record = await joinedEvents.findOne({ eventId, userEmail: req.user!.email }, { projection: { _id: 1 } });
  res.json({ joined: Boolean(record) });
});

/** GET /api/joined-events  (private) - only the caller's own records, sorted by event date. */
joinedRouter.get("/joined-events", requireAuth, async (req, res) => {
  const list = await joinedEvents
    .find({ userEmail: req.user!.email })
    .sort({ eventDate: 1, joinedAt: 1 })
    .limit(200)
    .toArray();
  res.json(list);
});
