import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interviewSession } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

// POST /api/interview/[interview_id]/answers
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ interview_id: string }> }
) {
  try {
    // 👉 FIX: await params
    const { interview_id } = await context.params;

    const interviewId = interview_id;
    const { candidateId, answers } = await req.json();

    if (!interviewId || !candidateId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check existing record
    const existing = await db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.candidateId, candidateId));

    let saved;

    if (existing.length > 0) {
      // Update
      saved = await db
        .update(interviewSession)
        .set({ answers })
        .where(eq(interviewSession.candidateId, candidateId))
        .returning();
    } else {
      // Insert
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
