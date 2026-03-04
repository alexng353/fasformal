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
import { eq, and, gt } from "drizzle-orm";
import { generateSessionToken } from "../../lib/session";
import { generateOtp } from "../../lib/otp";
import { generateConfirmationNumber } from "../../lib/confirmation";
import { sendEmail } from "../../lib/email";

export const authModule = new Elysia({ prefix: "/auth" })
  // Admin login
  .post(
    "/admin/login",
    async ({ body, cookie, error }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      });
      if (!user) return error(401, "Invalid credentials");

      const valid = await Bun.password.verify(body.password, user.passwordHash);
      if (!valid) return error(401, "Invalid credentials");

      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(sessions).values({
        sessionToken: token,
        userId: user.id,
        expiresAt,
      });

      cookie.admin_session.set({
        value: token,
        httpOnly: true,
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
    const token = cookie.admin_session?.value;
    if (token) {
      await db.delete(sessions).where(eq(sessions.sessionToken, token));
      cookie.admin_session.remove();
    }
    return { ok: true };
  })

  // Get invite info
  .get(
    "/invite/:token",
    async ({ params, error }) => {
      const invite = await db.query.inviteLinks.findFirst({
        where: and(
          eq(inviteLinks.token, params.token),
          gt(inviteLinks.expiresAt, new Date())
        ),
      });
      if (!invite) return error(404, "Invalid or expired invite link");
      if (invite.currentUses >= invite.maxUses)
        return error(410, "Invite link has been fully used");
      return { role: invite.role };
    },
    { params: t.Object({ token: t.String() }) }
  )

  // Accept invite — create account
  .post(
    "/invite/accept",
    async ({ body, error }) => {
      const invite = await db.query.inviteLinks.findFirst({
        where: and(
          eq(inviteLinks.token, body.token),
          gt(inviteLinks.expiresAt, new Date())
        ),
      });
      if (!invite) return error(400, "Invalid or expired invite link");
      if (invite.currentUses >= invite.maxUses)
        return error(410, "Invite link has been fully used");

      const existing = await db.query.users.findFirst({
        where: eq(users.email, body.email),
      });
      if (existing) return error(409, "Email already registered");

      const passwordHash = await Bun.password.hash(body.password);
      await db.insert(users).values({
        email: body.email,
        passwordHash,
        role: invite.role,
        name: body.name,
      });

      await db
        .update(inviteLinks)
        .set({ currentUses: invite.currentUses + 1 })
        .where(eq(inviteLinks.id, invite.id));

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
    async ({ body, error }) => {
      const activeYear = await db.query.years.findFirst({
        where: eq(years.isActive, true),
      });
      if (!activeYear) return error(400, "No active event year");

      if (activeYear.emailDomainRestriction) {
        const domain = body.email.split("@")[1];
        if (domain !== activeYear.emailDomainRestriction) {
          return error(400, `Email must end with @${activeYear.emailDomainRestriction}`);
        }
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
    async ({ body, cookie, error }) => {
      const activeYear = await db.query.years.findFirst({
        where: eq(years.isActive, true),
      });
      if (!activeYear) return error(400, "No active event year");

      const codeRecord = await db.query.emailCodes.findFirst({
        where: and(
          eq(emailCodes.email, body.email),
          eq(emailCodes.code, body.code),
          eq(emailCodes.yearId, activeYear.id),
          gt(emailCodes.expiresAt, new Date())
        ),
      });
      if (!codeRecord) return error(401, "Invalid or expired code");
      if (codeRecord.usedAt) return error(401, "Code already used");

      // Mark code as used
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

      cookie.attendee_session.set({
        value: token,
        httpOnly: true,
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
  .get("/me", async ({ cookie, error }) => {
    const token = cookie.admin_session?.value;
    if (!token) return error(401, "Not authenticated");

    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.sessionToken, token),
        gt(sessions.expiresAt, new Date())
      ),
    });
    if (!session) return error(401, "Session expired");

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });
    if (!user) return error(401, "User not found");

    return { id: user.id, email: user.email, role: user.role, name: user.name };
  })

  // Get current attendee
  .get("/attendee/me", async ({ cookie, error }) => {
    const token = cookie.attendee_session?.value;
    if (!token) return error(401, "Not authenticated");

    const session = await db.query.attendeeSessions.findFirst({
      where: and(
        eq(attendeeSessions.sessionToken, token),
        gt(attendeeSessions.expiresAt, new Date())
      ),
    });
    if (!session) return error(401, "Session expired");

    const attendee = await db.query.attendees.findFirst({
      where: eq(attendees.id, session.attendeeId),
    });
    if (!attendee) return error(401, "Attendee not found");

    return attendee;
  });
