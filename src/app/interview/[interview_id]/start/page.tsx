import { db } from "@/db";
import { candidate } from "@/db/schema";
import { eq } from "drizzle-orm";

import InterviewPage from "./_components/InterviewPage";

export default function StartPage({
  params,
}: {
  params: { interview_id: string };
}) {
  const interviewId = params.interview_id;

  if (!interviewId) {
    return <div className="p-4 text-red-500">Invalid interview ID</div>;
  }

  return <CandidateLoader interviewId={interviewId} />;
}

async function CandidateLoader({ interviewId }: { interviewId: string }) {
  const result = await db
    .select()
    .from(candidate)
    .where(eq(candidate.interviewId, interviewId));

  if (result.length === 0) {
    return (
      <div className="p-4 text-red-500">
        No candidate found for this interview.
      </div>
    );
  }

  const candidateId = result[0].id;

  return <InterviewPage interviewId={interviewId} candidateId={candidateId} />;
}
