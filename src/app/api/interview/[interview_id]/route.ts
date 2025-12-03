import { NextResponse } from "next/server";
import { db } from "@/db";
import { interview } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ interview_id: string }> }
) {
  try {
    const { interview_id } = await params; // ✅ REQUIRED FIX

    const rows = await db
      .select()
      .from(interview)
      .where(eq(interview.id, interview_id));

    if (!rows.length) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
