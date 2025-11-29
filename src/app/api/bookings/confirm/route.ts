import { NextResponse } from "next/server";
import { db } from "@/db";
import { booking, bookingHold } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { slotOverlaps } from "@/services/booking";

const CAPACITY = Number(process.env.SLOT_CAPACITY ?? 15);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { holdId, candidateId } = body;

    if (!holdId || !candidateId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // STEP 1 — Load the hold
    const hold = await db
      .select()
      .from(bookingHold)
      .where(eq(bookingHold.id, holdId))
      .then((r) => r[0]);

    if (!hold) {
      return NextResponse.json({ error: "hold_not_found" }, { status: 404 });
    }

    if (hold.expiresAt < new Date()) {
      return NextResponse.json({ error: "hold_expired" }, { status: 410 });
    }

    if (hold.candidateId !== candidateId) {
      return NextResponse.json({ error: "not_hold_owner" }, { status: 403 });
    }

    // STEP 2 — Check slot capacity AGAIN
    const allBookings = await db
      .select()
      .from(booking)
      .where(eq(booking.interviewId, hold.interviewId));

    const allHolds = await db
      .select()
      .from(bookingHold)
      .where(eq(bookingHold.interviewId, hold.interviewId));

    const used =
      allBookings.filter((b) =>
        slotOverlaps(
          hold.start,
          hold.end,
          new Date(b.start),
          new Date(b.end)
        )
      ).length +
      allHolds.filter(
        (h) =>
          h.id !== holdId &&
          h.expiresAt > new Date() &&
          slotOverlaps(
            hold.start,
            hold.end,
            new Date(h.start),
            new Date(h.end)
          )
      ).length;

    if (used >= CAPACITY) {
      return NextResponse.json({ error: "slot_full" }, { status: 409 });
    }

    // STEP 3 — Insert final booking
    const bookingId = uuidv4();

    await db.insert(booking).values({
      id: bookingId,
      interviewId: hold.interviewId,
      candidateId: hold.candidateId,
      recruiterId: hold.recruiterId ?? null,
      start: hold.start,
      end: hold.end,
      status: "confirmed",
      providerEventId: null,
      provider: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // STEP 4 — Remove hold (make sure it does not block slots anymore)
    await db.delete(bookingHold).where(eq(bookingHold.id, holdId));

    return NextResponse.json({ success: true, bookingId });
  } catch (err) {
    console.error("CONFIRM ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
