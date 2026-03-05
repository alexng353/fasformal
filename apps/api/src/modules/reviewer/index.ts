import { Elysia, t } from "elysia";
import { db } from "../../db";
import { attendees, reviewerDsus, dsus, years } from "../../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireStaff } from "../auth/guards";

const tAttendeeStatus = t.Union([
  t.Literal("pending"),
  t.Literal("verified"),
  t.Literal("paid"),
  t.Literal("banned"),
  t.Literal("waitlisted"),
  t.Literal("admitted"),
]);

export const reviewerModule = new Elysia({ prefix: "/reviewer" })
  .use(requireStaff)

  // List submissions filtered by reviewer's DSU assignments (admins see all)
  .get(
    "/submissions",
    async ({ user, query }) => {
      const activeYear = await db.query.years.findFirst({
        where: eq(years.isActive, true),
      });
      if (!activeYear) return [];

      let dsuFilter: string[] | null = null;

      if (user.role === "reviewer") {
        const assignments = await db.query.reviewerDsus.findMany({
          where: eq(reviewerDsus.userId, user.id),
        });
        const yearDsus = await db.query.dsus.findMany({
          where: eq(dsus.yearId, activeYear.id),
        });
        const yearDsuIds = new Set(yearDsus.map((d) => d.id));
        dsuFilter = assignments
          .filter((a) => yearDsuIds.has(a.dsuId))
          .map((a) => a.dsuId);
        if (dsuFilter.length === 0) return [];
      }

      const conditions = [eq(attendees.yearId, activeYear.id)];
      if (query.status)
        conditions.push(eq(attendees.status, query.status));

      const allAttendees = await db.query.attendees.findMany({
        where: and(...conditions),
        orderBy: (a, { desc }) => desc(a.createdAt),
      });

      if (dsuFilter) {
        return allAttendees.filter(
          (a) => a.dsuId && dsuFilter!.includes(a.dsuId)
        );
      }
      return allAttendees;
    },
    {
      query: t.Object({
        status: t.Optional(tAttendeeStatus),
      }),
    }
  )

  // Get single submission
  .get(
    "/submissions/:id",
    async ({ params, user, error }) => {
      const attendee = await db.query.attendees.findFirst({
        where: eq(attendees.id, params.id),
      });
      if (!attendee) return error(404, "Submission not found");

      // Check DSU access for reviewers
      if (user.role === "reviewer") {
        if (!attendee.dsuId) {
          return error(403, "Access denied to this submission");
        }
        const assignments = await db.query.reviewerDsus.findMany({
          where: eq(reviewerDsus.userId, user.id),
        });
        if (!assignments.some((a) => a.dsuId === attendee.dsuId)) {
          return error(403, "Access denied to this submission");
        }
      }

      return attendee;
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Update submission (reviewer checklist)
  .patch(
    "/submissions/:id",
    async ({ params, body, user, error }) => {
      const attendee = await db.query.attendees.findFirst({
        where: eq(attendees.id, params.id),
      });
      if (!attendee) return error(404, "Submission not found");

      // Check DSU access for reviewers
      if (user.role === "reviewer") {
        if (!attendee.dsuId) {
          return error(403, "Access denied to this submission");
        }
        const assignments = await db.query.reviewerDsus.findMany({
          where: eq(reviewerDsus.userId, user.id),
        });
        if (!assignments.some((a) => a.dsuId === attendee.dsuId)) {
          return error(403, "Access denied to this submission");
        }
      }

      const update: Record<string, unknown> = {
        reviewedById: user.id,
        updatedAt: new Date(),
      };

      if (body.status) update.status = body.status;
      if (body.reviewNote !== undefined) update.reviewNote = body.reviewNote;

      const [updated] = await db
        .update(attendees)
        .set(update)
        .where(eq(attendees.id, params.id))
        .returning();

      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Optional(tAttendeeStatus),
        reviewNote: t.Optional(t.Nullable(t.String())),
      }),
    }
  );
