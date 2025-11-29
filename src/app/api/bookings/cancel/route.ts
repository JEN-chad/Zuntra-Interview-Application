// app/api/bookings/cancel/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookingHold } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, candidateId } = body;

    if (!bookingId || !candidateId)
      return NextResponse.json({ error: "missing" }, { status: 400 });

    const rows = await db
      .select()
      .from(bookingHold)
      .where(eq(bookingHold.id, bookingId));

    const hold = rows[0];

    if (!hold)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (hold.candidateId !== candidateId)
      return NextResponse.json({ error: "not_owner" }, { status: 403 });

    await db.delete(bookingHold).where(eq(bookingHold.id, bookingId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
