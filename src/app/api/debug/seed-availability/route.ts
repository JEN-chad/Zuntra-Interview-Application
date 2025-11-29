import { NextResponse } from "next/server";
import {db} from "@/db";
import { recruiterAvailability } from "@/db/schema";

export async function GET() {
  await db.insert(recruiterAvailability).values({
    id: "test-availability",
    userId: "aOFcgeWOJx8nl5fVbxubhla3uFwjwsRt",   // recruiter user id from user table
    startTime: new Date("2025-01-01T09:00:00Z"),
    endTime: new Date("2025-01-01T17:00:00Z"),
    createdAt: new Date(),
  });

  return NextResponse.json({ seeded: true });
}
