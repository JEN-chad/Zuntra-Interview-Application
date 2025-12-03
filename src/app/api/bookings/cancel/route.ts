// app/api/bookings/cancel/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookingHold, interviewSlot } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { holdId, candidateId } = body;

    if (!holdId || !candidateId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // ------------------------------
    // 1. FETCH HOLD
    // ------------------------------
    const hold = (
      await db.select().from(bookingHold).where(eq(bookingHold.id, holdId))
    )[0];

    if (!hold)
      return NextResponse.json({ error: "hold_not_found" }, { status: 404 });

    // Owner check
    if (hold.candidateId !== candidateId) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }

    // ------------------------------
    // 2. FETCH SLOT RECORD
    // ------------------------------
    const slotRecord = (
      await db
        .select()
        .from(interviewSlot)
        .where(eq(interviewSlot.id, hold.slotId))
    )[0];

    if (!slotRecord) {
      return NextResponse.json({ error: "slot_not_found" }, { status: 404 });
    }

    let slots = slotRecord.slots as any[];

    // ------------------------------
    // 3. RESTORE CAPACITY
    // ------------------------------
    if (slots[hold.slotIndex]) {
      slots[hold.slotIndex].capacityLeft =
        (slots[hold.slotIndex].capacityLeft || 0) + 1;

      // Prevent overflow beyond capacity
      if (slots[hold.slotIndex].capacityLeft > slots[hold.slotIndex].capacity) {
        slots[hold.slotIndex].capacityLeft = slots[hold.slotIndex].capacity;
      }
    }

    // ------------------------------
    // 4. UPDATE SLOT RECORD
    // ------------------------------
    await db
      .update(interviewSlot)
      .set({ slots })
      .where(eq(interviewSlot.id, hold.slotId));

    // ------------------------------
    // 5. DELETE HOLD
    // ------------------------------
    await db.delete(bookingHold).where(eq(bookingHold.id, holdId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
