import { Elysia, t } from "elysia";
import { db } from "../../db";
import { attendees, users, inviteLinks } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../auth/guards";
import { randomBytes } from "crypto";
import { sendEmail } from "../../lib/email";
import { escapeHtml } from "../../lib/html";

const tAttendeeStatus = t.Union([
  t.Literal("pending"),
  t.Literal("verified"),
  t.Literal("paid"),
  t.Literal("banned"),
  t.Literal("waitlisted"),
  t.Literal("admitted"),
]);

const tUserRole = t.Union([t.Literal("admin"), t.Literal("reviewer")]);

function getStatusEmailContent(status: string, firstName: string | null) {
  const name = escapeHtml(firstName || "Applicant");
  switch (status) {
    case "admitted":
      return {
        subject: "You've been accepted!",
        body: `<p>Hi ${name},</p><p>Congratulations! We're excited to let you know that you've been accepted to FAS Formal. We look forward to seeing you there!</p><p>Best regards,<br/>FAS Formal Team</p>`,
      };
    case "waitlisted":
      return {
        subject: "Waitlist Update",
        body: `<p>Hi ${name},</p><p>Thank you for your application to FAS Formal. You've been placed on our waitlist. We'll notify you if a spot becomes available.</p><p>Best regards,<br/>FAS Formal Team</p>`,
      };
    case "banned":
      return {
        subject: "Application Update",
        body: `<p>Hi ${name},</p><p>Thank you for your interest in FAS Formal. After reviewing your application, we're unable to offer you a spot at this time.</p><p>Best regards,<br/>FAS Formal Team</p>`,
      };
    default:
      return { subject: "", body: "" };
  }
}

export const adminModule = new Elysia({ prefix: "/admin" })
  .use(requireAdmin)

  // List all submissions (optionally filter by year, status, dsu)
  .get(
    "/submissions",
    async ({ query }) => {
      const conditions = [];
      if (query.yearId) conditions.push(eq(attendees.yearId, query.yearId));
      if (query.status)
        conditions.push(eq(attendees.status, query.status));

      const allAttendees = await db.query.attendees.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (a, { desc }) => desc(a.createdAt),
      });

      // Resolve DSU names
      const allDsus = await db.query.dsus.findMany();
      const dsuMap = new Map(allDsus.map((d) => [d.id, d.name]));

      return allAttendees.map((a) => ({
        ...a,
        dsuName: a.dsuId ? dsuMap.get(a.dsuId) ?? null : null,
      }));
    },
    {
      query: t.Object({
        yearId: t.Optional(t.String()),
        status: t.Optional(tAttendeeStatus),
      }),
    }
  )

  // Get single submission
  .get(
    "/submissions/:id",
    async ({ params, status }) => {
      const attendee = await db.query.attendees.findFirst({
        where: eq(attendees.id, params.id),
      });
      if (!attendee) return status(404, "Submission not found");
      return attendee;
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Update submission status
  .patch(
    "/submissions/:id/status",
    async ({ params, body, user }) => {
      const [updated] = await db
        .update(attendees)
        .set({
          status: body.status,
          reviewedById: user.id,
          reviewNote: body.reviewNote,
          updatedAt: new Date(),
        })
        .where(eq(attendees.id, params.id))
        .returning();

      // Send email notification for status changes
      if (updated?.email && ["admitted", "waitlisted", "banned"].includes(body.status)) {
        const emailContent = getStatusEmailContent(body.status, updated.firstName);
        sendEmail(updated.email, emailContent.subject, emailContent.body).catch((err) =>
          console.error("[ADMIN] Failed to send status email:", err)
        );
      }

      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: tAttendeeStatus,
        reviewNote: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // List staff users
  .get("/users", async () => {
    const allUsers = await db.query.users.findMany({
      orderBy: (u, { asc }) => asc(u.name),
    });
    return allUsers.map(({ passwordHash, ...u }) => u);
  })

  // Change user password
  // - Changing your own password requires currentPassword
  // - Changing another user's password does not (admin privilege)
  .patch(
    "/users/:id/password",
    async ({ params, body, user, status }) => {
      const target = await db.query.users.findFirst({
        where: eq(users.id, params.id),
      });
      if (!target) return status(404, "User not found");

      // If changing own password, verify current password
      if (params.id === user.id) {
        if (!body.currentPassword) {
          return status(400, "Current password is required when changing your own password");
        }
        const valid = await Bun.password.verify(body.currentPassword, target.passwordHash);
        if (!valid) return status(403, "Current password is incorrect");
      }

      const passwordHash = await Bun.password.hash(body.newPassword);
      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, params.id));

      if (params.id !== user.id) {
        console.log(
          `[AUDIT] Admin ${user.id} (${user.email}) changed password for user ${params.id} (${target.email})`
        );
      }

      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        currentPassword: t.Optional(t.String()),
        newPassword: t.String({ minLength: 8 }),
      }),
    }
  )

  // Delete user
  .delete(
    "/users/:id",
    async ({ params, user, status }) => {
      if (params.id === user.id) return status(400, "Cannot delete yourself");
      await db.delete(users).where(eq(users.id, params.id));
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // List invite links
  .get("/invite-links", async () => {
    return db.query.inviteLinks.findMany({
      orderBy: (i, { desc }) => desc(i.createdAt),
    });
  })

  // Create invite link
  .post(
    "/invite-links",
    async ({ body, user }) => {
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(
        Date.now() + (body.expiresInHours || 72) * 60 * 60 * 1000
      );
      const [link] = await db
        .insert(inviteLinks)
        .values({
          token,
          role: body.role,
          createdById: user.id,
          expiresAt,
          maxUses: body.maxUses || 1,
        })
        .returning();
      return link;
    },
    {
      body: t.Object({
        role: tUserRole,
        maxUses: t.Optional(t.Number()),
        expiresInHours: t.Optional(t.Number()),
      }),
    }
  )

  // Delete invite link
  .delete(
    "/invite-links/:id",
    async ({ params }) => {
      await db.delete(inviteLinks).where(eq(inviteLinks.id, params.id));
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  );
