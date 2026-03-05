import { Elysia, t } from "elysia";
import { db } from "../../db";
import {
  users,
  sessions,
  inviteLinks,
  emailCodes,
  attendees,
  attendeeSessions,
  years,
} from "../../db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { generateSessionToken } from "../../lib/session";
import { generateOtp } from "../../lib/otp";
import { generateConfirmationNumber } from "../../lib/confirmation";
import { sendEmail } from "../../lib/email";
import { checkRateLimit } from "../../lib/rate-limit";

export const authModule = new Elysia({ prefix: "/auth" })
  // Admin login
  .post(
    "/admin/login",
    async ({ body, cookie, status, request }) => {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const rl = checkRateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
      if (!rl.allowed) {
        return status(429, "Too many login attempts. Please try again later.");
      }

      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      });
      if (!user) return status(401, "Invalid credentials");

      const valid = await Bun.password.verify(body.password, user.passwordHash);
      if (!valid) return status(401, "Invalid credentials");

      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(sessions).values({
        sessionToken: token,
        userId: user.id,
        expiresAt,
      });

      cookie.admin_session!.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      return { id: user.id, email: user.email, role: user.role, name: user.name };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  // Admin logout
  .post("/admin/logout", async ({ cookie }) => {
    const token = cookie.admin_session?.value as string | undefined;
    if (token) {
      await db.delete(sessions).where(eq(sessions.sessionToken, token));
      cookie.admin_session!.remove();
    }
    return { ok: true };
  })

  // Get invite info
  .get(
    "/invite/:token",
    async ({ params, status }) => {
      const invite = await db.query.inviteLinks.findFirst({
        where: and(
          eq(inviteLinks.token, params.token),
          gt(inviteLinks.expiresAt, new Date())
        ),
      });
      if (!invite) return status(404, "Invalid or expired invite link");
      if (invite.currentUses >= invite.maxUses)
        return status(410, "Invite link has been fully used");
      return { role: invite.role };
    },
    { params: t.Object({ token: t.String() }) }
  )

  // Accept invite — create account
  .post(
    "/invite/accept",
    async ({ body, status }) => {
      // Atomically claim one use of the invite link
      const [invite] = await db
        .update(inviteLinks)
        .set({ currentUses: sql`${inviteLinks.currentUses} + 1` })
        .where(
          and(
            eq(inviteLinks.token, body.token),
            gt(inviteLinks.expiresAt, new Date()),
            sql`${inviteLinks.currentUses} < ${inviteLinks.maxUses}`,
          )
        )
        .returning();
      if (!invite) return status(410, "Invalid, expired, or fully used invite link");

      const passwordHash = await Bun.password.hash(body.password);
      try {
        await db.insert(users).values({
          email: body.email,
          passwordHash,
          role: invite.role,
          name: body.name,
        });
      } catch (err: unknown) {
        // Roll back the use count since we didn't actually create a user
        await db
          .update(inviteLinks)
          .set({ currentUses: sql`${inviteLinks.currentUses} - 1` })
          .where(eq(inviteLinks.id, invite.id));
        if (
          err instanceof Error &&
          err.message.includes("unique") // unique constraint on users.email
        ) {
          return status(409, "Email already registered");
        }
        throw err;
      }

      return { ok: true };
    },
    {
      body: t.Object({
        token: t.String(),
        name: t.String(),
        email: t.String(),
        password: t.String({ minLength: 8 }),
      }),
    }
  )

  // Attendee: request OTP code
  .post(
    "/attendee/request-code",
    async ({ body, status }) => {
      const activeYear = await db.query.years.findFirst({
        where: eq(years.isActive, true),
      });
      if (!activeYear) return status(400, "No active event year");

      if (activeYear.submissionDeadline && new Date() > activeYear.submissionDeadline) {
        return status(400, "Registration is closed for this event");
      }

      if (activeYear.emailDomainRestriction) {
        const domain = body.email.split("@")[1];
        if (domain !== activeYear.emailDomainRestriction) {
          return status(400, `Email must end with @${activeYear.emailDomainRestriction}`);
        }
      }

      // Rate limit: max 3 codes per email per 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentCodes = await db.query.emailCodes.findMany({
        where: and(
          eq(emailCodes.email, body.email),
          gt(emailCodes.createdAt, tenMinutesAgo),
        ),
      });
      if (recentCodes.length >= 3) {
        return status(429, "Too many code requests. Please wait a few minutes.");
      }

      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.insert(emailCodes).values({
        email: body.email,
        code,
        yearId: activeYear.id,
        expiresAt,
      });

      await sendEmail(
        body.email,
        `Your FAS Formal verification code`,
        `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`
      );

      return { ok: true };
    },
    {
      body: t.Object({ email: t.String() }),
    }
  )

  // Attendee: verify OTP code
  .post(
    "/attendee/verify-code",
    async ({ body, cookie, status, request }) => {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const rl = checkRateLimit(`verify-code:${ip}`, 10, 15 * 60 * 1000);
      if (!rl.allowed) {
        return status(429, "Too many verification attempts. Please try again later.");
      }

      const activeYear = await db.query.years.findFirst({
        where: eq(years.isActive, true),
      });
      if (!activeYear) return status(400, "No active event year");

      // Find the most recent unexpired code for this email+year
      const codeRecord = await db.query.emailCodes.findFirst({
        where: and(
          eq(emailCodes.email, body.email),
          eq(emailCodes.yearId, activeYear.id),
          gt(emailCodes.expiresAt, new Date())
        ),
        orderBy: (c, { desc }) => desc(c.createdAt),
      });

      if (!codeRecord) return status(401, "Invalid or expired code");
      if (codeRecord.usedAt) return status(401, "Code already used");
      if (codeRecord.attempts >= 5) return status(429, "Too many attempts. Please request a new code.");

      // Wrong code — increment attempts
      if (codeRecord.code !== body.code) {
        await db
          .update(emailCodes)
          .set({ attempts: sql`${emailCodes.attempts} + 1` })
          .where(eq(emailCodes.id, codeRecord.id));
        return status(401, "Invalid or expired code");
      }

      // Correct code — mark as used
      await db
        .update(emailCodes)
        .set({ usedAt: new Date() })
        .where(eq(emailCodes.id, codeRecord.id));

      // Find or create attendee
      let attendee = await db.query.attendees.findFirst({
        where: and(
          eq(attendees.yearId, activeYear.id),
          eq(attendees.email, body.email)
        ),
      });

      if (!attendee) {
        const confirmationNumber = generateConfirmationNumber(activeYear.year);
        const [created] = await db
          .insert(attendees)
          .values({
            yearId: activeYear.id,
            email: body.email,
            emailVerified: true,
            confirmationNumber,
            currentStep: 3, // Skip steps 1-2 (email + verify)
          })
          .returning();
        attendee = created!;
      } else {
        await db
          .update(attendees)
          .set({ emailVerified: true })
          .where(eq(attendees.id, attendee.id));
      }

      // Create attendee session
      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      await db.insert(attendeeSessions).values({
        sessionToken: token,
        attendeeId: attendee.id,
        expiresAt,
      });

      cookie.attendee_session!.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      return { ok: true, currentStep: attendee.currentStep };
    },
    {
      body: t.Object({
        email: t.String(),
        code: t.String(),
      }),
    }
  )

  // Get current user (admin/reviewer)
  .get("/me", async ({ cookie, status }) => {
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

    return { id: user.id, email: user.email, role: user.role, name: user.name };
  })

  // Get current attendee
  .get("/attendee/me", async ({ cookie, status }) => {
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

    const { reviewedById, reviewNote, status: _, ...safeAttendee } = attendee;
    return safeAttendee;
  });
