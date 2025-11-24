import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    websocket: "ws://localhost:3001",
  });
}
