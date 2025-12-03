import { NextResponse } from "next/server";
import { db } from "@/db";
import { interview, resumeQuestions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ interview_id: string }> }
) {
  const { interview_id } = await params;

  const [interviewRow] = await db
    .select()
    .from(interview)
    .where(eq(interview.id, interview_id));

  if (!interviewRow) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  const [resumeRow] = await db
    .select()
    .from(resumeQuestions)
    .where(eq(resumeQuestions.interviewId, interview_id));

  const resumeQs = Array.isArray(resumeRow?.questions)
    ? resumeRow.questions
    : [];

  const interviewQs = Array.isArray(interviewRow.questionList)
    ? interviewRow.questionList
    : [];

  const finalQuestions = [
    ...resumeQs.map((qObj, i) => ({
      id: `resume-${i}`,
      question: qObj.question,    // <-- FIXED
      type: "resume",
    })),
    ...interviewQs.map((qObj, i) => ({
      id: `interview-${i}`,
      question: qObj.question,    // <-- FIXED
      type: qObj.type ?? "interview",
    })),
  ];

  return NextResponse.json(finalQuestions);
}
