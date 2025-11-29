// services/calendar.ts
import { google } from "googleapis";
import db from "@/db";
import { calendarConnection, user } from "@/db/schema";

/**
 * createGoogleEvent(conn, { start, end, summary, description, attendees, joinLink })
 * - conn: calendar_connection row
 */

export async function createGoogleEvent(conn: any, { start, end, summary, description, attendees = [], joinLink }: any) {
  const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oAuth2Client.setCredentials({
    refresh_token: conn.refreshToken,
  });

  // refresh to get access token
  const tokens = await oAuth2Client.getAccessToken(); // returns token string (may be cached)
  // (google library will auto-refresh using refresh_token when necessary)

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const eventBody: any = {
    summary,
    description,
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: new Date(end).toISOString() },
    attendees,
  };

  // if joinLink provided, set as description (or create conferenceData)
  if (joinLink) {
    eventBody.description = `${description}\n\nJoin Link: ${joinLink}`;
  }

  const res = await calendar.events.insert({
    calendarId: conn.calendarId ?? "primary",
    requestBody: eventBody,
    sendUpdates: "all",
  });

  return res.data;
}

export async function cancelGoogleEvent(recruiterId: string, eventId: string) {
  // find connection
  const conns = await db.select().from(calendarConnection).where(calendarConnection.userId.eq(recruiterId));
  const conn = conns[0];
  if (!conn) throw new Error("no calendar connection");

  const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oAuth2Client.setCredentials({
    refresh_token: conn.refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
  await calendar.events.delete({ calendarId: conn.calendarId ?? "primary", eventId });
}
