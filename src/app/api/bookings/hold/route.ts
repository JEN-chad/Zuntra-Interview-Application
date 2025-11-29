// app/api/bookings/hold/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { booking, bookingHold, candidate } from "@/db/schema";
import { eq } from "drizzle-orm";
import { slotOverlaps } from "@/services/booking";
import { v4 as uuidv4 } from "uuid";

const HOLD_TTL_SECONDS = Number(process.env.SLOT_HOLD_TTL_SECONDS ?? 300);
const CAPACITY = Number(process.env.SLOT_CAPACITY ?? 15);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { interviewId, candidateId, start, end } = body;

    if (!interviewId || !candidateId || !start || !end) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Validate candidate
    const cand = await db
      .select()
      .from(candidate)
      .where(eq(candidate.id, candidateId))
      .then((r) => r[0]);

    if (!cand)
      return NextResponse.json({ error: "candidate_not_found" }, { status: 404 });

    if (cand.interviewId !== interviewId)
      return NextResponse.json(
        { error: "candidate_not_in_interview" },
        { status: 403 }
      );

    // 3️⃣ Prevent duplicate confirmed bookings
    const existingConfirmed = await db
      .select()
      .from(booking)
      .where(eq(booking.candidateId, candidateId))
      .then((rows) =>
        rows.find(
          (b) => b.interviewId === interviewId && b.status === "confirmed"
        )
      );

    if (existingConfirmed) {
      return NextResponse.json(
        { error: "already_booked" },
        { status: 409 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate)
      return NextResponse.json({ error: "invalid_slot" }, { status: 400 });

    const now = new Date();

    // Get bookings
    const overlappingBookings = await db
      .select()
      .from(booking)
      .where(eq(booking.interviewId, interviewId));

    // Get holds
    const overlappingHolds = await db
      .select()
      .from(bookingHold)
      .where(eq(bookingHold.interviewId, interviewId));

    const bookingsCount = overlappingBookings.filter((b) =>
      slotOverlaps(startDate, endDate, new Date(b.start), new Date(b.end))
    ).length;

    const holdsCount = overlappingHolds.filter(
      (h) =>
        new Date(h.expiresAt) > now &&
        slotOverlaps(startDate, endDate, new Date(h.start), new Date(h.end))
    ).length;

    const used = bookingsCount + holdsCount;

    if (used >= CAPACITY) {
      return NextResponse.json({ error: "slot_full" }, { status: 409 });
    }

    // Create HOLD record
    const holdId = uuidv4();
    const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

    await db.insert(bookingHold).values({
      id: holdId,
      candidateId,
      interviewId,
      recruiterId: null,
      start: startDate,
      end: endDate,
      expiresAt,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      holdId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("HOLD ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
