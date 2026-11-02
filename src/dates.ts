import { config } from "./config.js";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: config.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date as YYYY-MM-DD in the configured timezone (Asia/Dhaka by default). */
export function todayString(now: Date = new Date()): string {
  return dateFormatter.format(now);
}

/** Adds (or subtracts) whole days to a YYYY-MM-DD string. */
export function addDays(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** True for a well formed, real calendar date such as 2026-12-05 (rejects 2026-02-31). */
export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Events must be created for a day after today. */
export function isFutureDate(value: string): boolean {
  return value > todayString();
}

/** An event is upcoming until its day is over. */
export function isUpcoming(value: string): boolean {
  return value >= todayString();
}
