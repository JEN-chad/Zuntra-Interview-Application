import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

// Save all answers at the end
export async function POST(req: NextRequest) {
  try {
    const { interviewId, candidateId, answers } = await req.json();

    if (!interviewId || !candidateId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if exists
    const existing = await db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.candidateId, candidateId));

    let saved;

    if (existing.length > 0) {
      saved = await db
        .update(interviewSession)
        .set({ answers })
        .where(eq(interviewSession.candidateId, candidateId))
        .returning();
    } else {
      saved = await db
        .insert(interviewSession)
        .values({
          id: uuid(),
          interviewId,
          candidateId,
          answers,
        })
        .returning();
    }

    return NextResponse.json(saved[0]);
  } catch (err) {
    console.error("save-answer POST error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
