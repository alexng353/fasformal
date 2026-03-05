import { Elysia, t } from "elysia";
import { db } from "../../db";
import { years, dsus, reviewerDsus, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../auth/guards";

export const settingsModule = new Elysia({ prefix: "/settings" })
  .use(requireAdmin)

  // List all years
  .get("/years", async () => {
    return db.query.years.findMany({ orderBy: (y, { desc }) => desc(y.year) });
  })

  // Create year
  .post(
    "/years",
    async ({ body }) => {
      const [year] = await db.insert(years).values(body).returning();
      return year;
    },
    {
      body: t.Object({
        year: t.Number(),
        eventName: t.String(),
        ticketPrice: t.String(),
        conditionalPricingEnabled: t.Optional(t.Boolean()),
        studentPrice: t.Optional(t.Nullable(t.String())),
        nonStudentPrice: t.Optional(t.Nullable(t.String())),
        alumniPrice: t.Optional(t.Nullable(t.String())),
        paymentEmail: t.String(),
        paymentDescriptionTemplate: t.String(),
        paymentDeadlineHours: t.Optional(t.Number()),
        refundDeadline: t.Optional(t.Nullable(t.String())),
        submissionDeadline: t.Optional(t.Nullable(t.String())),
        formSlug: t.Optional(t.Nullable(t.String())),
        tosText: t.String(),
        waiverLink: t.String(),
        waiverSubmissionEmail: t.String(),
        emailDomainRestriction: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // Update year
  .patch(
    "/years/:id",
    async ({ params, body }) => {
      const refundDeadline = body.refundDeadline
        ? new Date(body.refundDeadline)
        : body.refundDeadline === null
          ? null
          : undefined;

      const submissionDeadline = body.submissionDeadline
        ? new Date(body.submissionDeadline)
        : body.submissionDeadline === null
          ? null
          : undefined;

      const updateData: Record<string, unknown> = {
        ...body,
        updatedAt: new Date(),
      };
      if (refundDeadline !== undefined) {
        updateData.refundDeadline = refundDeadline;
      } else {
        delete updateData.refundDeadline;
      }
      if (submissionDeadline !== undefined) {
        updateData.submissionDeadline = submissionDeadline;
      } else {
        delete updateData.submissionDeadline;
      }

      const [updated] = await db
        .update(years)
        .set(updateData)
        .where(eq(years.id, params.id))
        .returning();
      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        eventName: t.Optional(t.String()),
        ticketPrice: t.Optional(t.String()),
        conditionalPricingEnabled: t.Optional(t.Boolean()),
        studentPrice: t.Optional(t.Nullable(t.String())),
        nonStudentPrice: t.Optional(t.Nullable(t.String())),
        alumniPrice: t.Optional(t.Nullable(t.String())),
        paymentEmail: t.Optional(t.String()),
        paymentDescriptionTemplate: t.Optional(t.String()),
        paymentDeadlineHours: t.Optional(t.Number()),
        refundDeadline: t.Optional(t.Nullable(t.String())),
        submissionDeadline: t.Optional(t.Nullable(t.String())),
        formSlug: t.Optional(t.Nullable(t.String())),
        tosText: t.Optional(t.String()),
        waiverLink: t.Optional(t.String()),
        waiverSubmissionEmail: t.Optional(t.String()),
        emailDomainRestriction: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // Activate a year (deactivate all others)
  .post(
    "/years/:id/activate",
    async ({ params }) => {
      await db.update(years).set({ isActive: false });
      const [updated] = await db
        .update(years)
        .set({ isActive: true })
        .where(eq(years.id, params.id))
        .returning();
      return updated;
    },
    { params: t.Object({ id: t.String() }) }
  )

  // List DSUs for a year
  .get(
    "/years/:id/dsus",
    async ({ params }) => {
      return db.query.dsus.findMany({
        where: eq(dsus.yearId, params.id),
        orderBy: (d, { asc }) => asc(d.name),
      });
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Create DSU
  .post(
    "/years/:id/dsus",
    async ({ params, body }) => {
      const [dsu] = await db
        .insert(dsus)
        .values({ yearId: params.id, name: body.name })
        .returning();
      return dsu;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ name: t.String() }),
    }
  )

  // Delete DSU
  .delete(
    "/years/:id/dsus/:dsuId",
    async ({ params }) => {
      await db.delete(dsus).where(
        and(eq(dsus.id, params.dsuId), eq(dsus.yearId, params.id))
      );
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), dsuId: t.String() }) }
  )

  // List reviewer-DSU assignments for a year
  .get(
    "/years/:id/reviewer-assignments",
    async ({ params }) => {
      const yearDsus = await db.query.dsus.findMany({
        where: eq(dsus.yearId, params.id),
      });
      const dsuIds = yearDsus.map((d) => d.id);
      if (dsuIds.length === 0) return [];

      const assignments = await db.query.reviewerDsus.findMany();
      const filtered = assignments.filter((a) => dsuIds.includes(a.dsuId));

      const result = [];
      for (const assignment of filtered) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, assignment.userId),
        });
        const dsu = yearDsus.find((d) => d.id === assignment.dsuId);
        if (user && dsu) {
          result.push({
            id: assignment.id,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            dsuId: dsu.id,
            dsuName: dsu.name,
          });
        }
      }
      return result;
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Create reviewer-DSU assignment
  .post(
    "/years/:id/reviewer-assignments",
    async ({ params, body, error }) => {
      const dsu = await db.query.dsus.findFirst({
        where: and(eq(dsus.id, body.dsuId), eq(dsus.yearId, params.id)),
      });
      if (!dsu) return error(404, "DSU not found for this year");

      const user = await db.query.users.findFirst({
        where: eq(users.id, body.userId),
      });
      if (!user || user.role !== "reviewer")
        return error(400, "User is not a reviewer");

      const [assignment] = await db
        .insert(reviewerDsus)
        .values({ userId: body.userId, dsuId: body.dsuId })
        .returning();
      return assignment;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ userId: t.String(), dsuId: t.String() }),
    }
  )

  // Delete reviewer-DSU assignment
  .delete(
    "/years/:id/reviewer-assignments/:assignmentId",
    async ({ params }) => {
      await db.delete(reviewerDsus).where(eq(reviewerDsus.id, params.assignmentId));
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), assignmentId: t.String() }) }
  );
