import { Elysia } from "elysia";
import { db } from "../../db";
import { sessions, attendeeSessions, users, attendees } from "../../db/schema";
import { eq, and, gt } from "drizzle-orm";

export const requireAdmin = new Elysia({ name: "requireAdmin" }).derive(
  { as: "scoped" },
  async ({ cookie, status }) => {
    const token = cookie.admin_session?.value as string | undefined;
    if (!token) return status(401, "Not authenticated");

    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.sessionToken, token),
        gt(sessions.expiresAt, new Date())
      ),
    });
    if (!session) return status(401, "Session expired");

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    if (!user) return status(401, "User not found");
    if (user.role !== "admin") return status(403, "Admin access required");

    return { user };
  }
);

export const requireStaff = new Elysia({ name: "requireStaff" }).derive(
  { as: "scoped" },
  async ({ cookie, status }) => {
    const token = cookie.admin_session?.value as string | undefined;
    if (!token) return status(401, "Not authenticated");

    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.sessionToken, token),
        gt(sessions.expiresAt, new Date())
      ),
    });
    if (!session) return status(401, "Session expired");

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    if (!user) return status(401, "User not found");
    if (user.role !== "admin" && user.role !== "reviewer")
      return status(403, "Staff access required");

    return { user };
  }
);

export const requireAttendee = new Elysia({ name: "requireAttendee" }).derive(
  { as: "scoped" },
  async ({ cookie, status }) => {
    const token = cookie.attendee_session?.value as string | undefined;
    if (!token) return status(401, "Not authenticated");

    const session = await db.query.attendeeSessions.findFirst({
      where: and(
        eq(attendeeSessions.sessionToken, token),
        gt(attendeeSessions.expiresAt, new Date())
      ),
    });
    if (!session) return status(401, "Session expired");

    const attendee = await db.query.attendees.findFirst({
      where: eq(attendees.id, session.attendeeId),
    });
    if (!attendee) return status(401, "Attendee not found");

    return { attendee };
  }
);
