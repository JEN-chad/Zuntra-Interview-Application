import { NextResponse } from "next/server";
import { db } from "@/db";
import { interview } from "@/db/schema";
import { eq } from "drizzle-orm";



type SessionData = {
  duration: number;
  questionList?: any[];
  createdAt?: string | Date | null;
};

export async function GET(
    req: Request,
  { params }: { params: Promise<{ id: string }> }

) {
  try {
     const { id } = await params; 

    const data = await db.query.interview.findFirst({
      where: eq(interview.id, id),
    });

    if (!data) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json({
      duration: data.duration,
      questionCount: data.questionList?.length || 0,
      expiresAt: data.createdAt
        ? new Date(new Date(data.createdAt).getTime() + 30 * 86400000)
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
