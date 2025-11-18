import { NextResponse } from "next/server";
import { db } from "@/db"; // your drizzle connection
import { interview } from "@/db/schema"; 
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await db
      .select()
      .from(interview)
      .where(eq(interview.id, params.id));

    if (!data.length) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
