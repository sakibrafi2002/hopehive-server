import { z } from "zod";
import { isRealDate } from "./dates.js";

export const EVENT_TYPES = [
  "Cleanup",
  "Plantation",
  "Donation",
  "Blood Donation",
  "Education",
  "Health Camp",
  "Flood Relief",
  "Food Distribution",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const eventSchema = z.object({
  title: z
    .string({ required_error: "Title is required", invalid_type_error: "Title must be text" })
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title can be at most 100 characters"),
  description: z
    .string({ required_error: "Description is required", invalid_type_error: "Description must be text" })
    .trim()
    .min(30, "Description must be at least 30 characters so volunteers know what to expect")
    .max(2000, "Description can be at most 2000 characters"),
  eventType: z.enum(EVENT_TYPES, {
    errorMap: () => ({ message: "Choose one of the available event types" }),
  }),
  thumbnail: z
    .string({ required_error: "Thumbnail image URL is required", invalid_type_error: "Thumbnail must be a URL" })
    .trim()
    .url("Enter a valid image URL")
    .refine((value) => /^https?:\/\//i.test(value), "Image URL must start with http:// or https://")
    .refine((value) => value.length <= 500, "Image URL is too long"),
  location: z
    .string({ required_error: "Location is required", invalid_type_error: "Location must be text" })
    .trim()
    .min(3, "Location must be at least 3 characters")
    .max(120, "Location can be at most 120 characters"),
  eventDate: z
    .string({ required_error: "Event date is required", invalid_type_error: "Event date must be text" })
    .trim()
    .refine(isRealDate, "Enter a valid date in YYYY-MM-DD format"),
});

export type EventInput = z.infer<typeof eventSchema>;

/** Collapses zod issues into { field: "first message" } for the client to show under each input. */
export function formatIssues(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
