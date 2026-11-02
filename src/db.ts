import { Collection, MongoClient, ObjectId } from "mongodb";
import { config } from "./config.js";

export interface EventDoc {
  _id?: ObjectId;
  title: string;
  description: string;
  eventType: string;
  thumbnail: string;
  location: string;
  /** YYYY-MM-DD */
  eventDate: string;
  creatorEmail: string;
  creatorName: string;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** One document per (user, event) pair, carrying a copy of the event so lists render without extra lookups. */
export interface JoinedEventDoc {
  _id?: ObjectId;
  eventId: ObjectId;
  userEmail: string;
  userName: string;
  joinedAt: Date;
  title: string;
  thumbnail: string;
  eventType: string;
  location: string;
  eventDate: string;
}

let client: MongoClient | undefined;

export let events!: Collection<EventDoc>;
export let joinedEvents!: Collection<JoinedEventDoc>;

export async function connectDb(): Promise<void> {
  client = new MongoClient(config.mongoUri);
  await client.connect();
  const db = client.db(config.dbName);

  events = db.collection<EventDoc>("events");
  joinedEvents = db.collection<JoinedEventDoc>("joinedEvents");

  await Promise.all([
    events.createIndex({ eventDate: 1, createdAt: 1 }),
    events.createIndex({ creatorEmail: 1, eventDate: 1 }),
    // A user can join a given event only once. The database enforces it, not just the UI.
    joinedEvents.createIndex({ eventId: 1, userEmail: 1 }, { unique: true }),
    joinedEvents.createIndex({ userEmail: 1, eventDate: 1 }),
  ]);
}

export async function closeDb(): Promise<void> {
  await client?.close();
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}
