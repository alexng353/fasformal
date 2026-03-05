import { Elysia, t } from "elysia";
import { db } from "../../db";
import { attendees, users, inviteLinks, years } from "../../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { requireAdmin } from "../auth/guards";
import { randomBytes } from "crypto";

export const adminModule = new Elysia({ prefix: "/admin" })
  .use(requireAdmin)

  // List all submissions (optionally filter by year, status, dsu)
  .get(
    "/submissions",
    async ({ query }) => {
      const conditions = [];
      if (query.yearId) conditions.push(eq(attendees.yearId, query.yearId));
      if (query.status)
        conditions.push(eq(attendees.status, query.status as any));

      const allAttendees = await db.query.attendees.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (a, { desc }) => desc(a.createdAt),
      });
      return allAttendees;
    },
    {
      query: t.Object({
        yearId: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // Get single submission
  .get(
    "/submissions/:id",
    async ({ params, error }) => {
      const attendee = await db.query.attendees.findFirst({
        where: eq(attendees.id, params.id),
      });
      if (!attendee) return error(404, "Submission not found");
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
          status: body.status as any,
          reviewedById: user.id,
          reviewNote: body.reviewNote,
          updatedAt: new Date(),
        })
        .where(eq(attendees.id, params.id))
        .returning();
      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
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
    async ({ params, body, user, error }) => {
      const target = await db.query.users.findFirst({
        where: eq(users.id, params.id),
      });
      if (!target) return error(404, "User not found");

      // If changing own password, verify current password
      if (params.id === user.id) {
        if (!body.currentPassword) {
          return error(400, "Current password is required when changing your own password");
        }
        const valid = await Bun.password.verify(body.currentPassword, target.passwordHash);
        if (!valid) return error(403, "Current password is incorrect");
      }

      const passwordHash = await Bun.password.hash(body.newPassword);
      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, params.id));

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
    async ({ params, user, error }) => {
      if (params.id === user.id) return error(400, "Cannot delete yourself");
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
          role: body.role as any,
          createdById: user.id,
          expiresAt,
          maxUses: body.maxUses || 1,
        })
        .returning();
      return link;
    },
    {
      body: t.Object({
        role: t.String(),
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
