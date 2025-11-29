// app/api/bookings/slots/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq, and, lt, gt } from "drizzle-orm";
import { booking, bookingHold, interview, recruiterAvailability } from "@/db/schema";
import { generateSlotsForAvailability, slotOverlaps } from "@/services/booking";

const SLOT_DURATION = Number(process.env.SLOT_DURATION_MINUTES ?? 30);
const DAYS_AHEAD = Number(process.env.SLOT_DAYS_AHEAD ?? 14);
const CAPACITY = Number(process.env.SLOT_CAPACITY ?? 15);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const interviewId = url.searchParams.get("interviewId");
    if (!interviewId) return NextResponse.json({ error: "interviewId required" }, { status: 400 });

    const now = new Date();
    const future = new Date(Date.now() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

    // fetch confirmed bookings for this interview in the window
    const booked = await db.select().from(booking).where(
      and(eq(booking.interviewId, interviewId), lt(booking.start, future), gt(booking.end, now), eq(booking.status, "confirmed"))
    );

    // active holds for this interview
    const holds = await db.select().from(bookingHold).where(
      and(eq(bookingHold.interviewId, interviewId), gt(bookingHold.expiresAt, now))
    );

    // optional per-interview/recruiter availability; if absent we will generate default windows in code later
    const availRows = await db.select().from(recruiterAvailability).where(eq(recruiterAvailability.interviewId, interviewId));

    const availabilities: any[] = (availRows && availRows.length > 0) ? availRows : [{
      // default repeating window object consumed by generateSlotsForAvailability
      startHour: Number(process.env.DEFAULT_DAY_START_UTC ?? 9),
      endHour: Number(process.env.DEFAULT_DAY_END_UTC ?? 18)
    }];

    const slots: Array<{ start: Date; end: Date; capacityLeft: number }> = [];

    for (const a of availabilities) {
      const generated = generateSlotsForAvailability(a, { slotDuration: SLOT_DURATION, daysAhead: DAYS_AHEAD, tz: "UTC" });
      for (const s of generated) {
        // skip past slots
        if (s.end.getTime() <= Date.now()) continue;

        const bookingsCount = booked.filter(b => slotOverlaps(s.start, s.end, b.start, b.end)).length;
        const holdsCount = holds.filter(h => slotOverlaps(s.start, s.end, h.start, h.end)).length;
        const used = bookingsCount + holdsCount;
        const capacityLeft = CAPACITY - used;
        if (capacityLeft > 0) {
          slots.push({ start: s.start, end: s.end, capacityLeft });
        }
      }
    }

    // sort and return
    slots.sort((a, b) => a.start.getTime() - b.start.getTime());
    return NextResponse.json({ slots });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
