import { Elysia, t } from "elysia";
import { db } from "../../db";
import { attendees, reviewerDsus, dsus, years } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { requireStaff } from "../auth/guards";
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
    async ({ params, user, status }) => {
      const attendee = await db.query.attendees.findFirst({
        where: eq(attendees.id, params.id),
      });
      if (!attendee) return status(404, "Submission not found");

      // Check DSU access for reviewers
      if (user.role === "reviewer") {
        if (!attendee.dsuId) {
          return status(403, "Access denied to this submission");
        }
        const assignments = await db.query.reviewerDsus.findMany({
          where: eq(reviewerDsus.userId, user.id),
        });
        if (!assignments.some((a) => a.dsuId === attendee.dsuId)) {
          return status(403, "Access denied to this submission");
        }
      }

      return attendee;
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Update submission (reviewer checklist)
  .patch(
    "/submissions/:id",
    async ({ params, body, user, status }) => {
      const attendee = await db.query.attendees.findFirst({
        where: eq(attendees.id, params.id),
      });
      if (!attendee) return status(404, "Submission not found");

      // Check DSU access for reviewers
      if (user.role === "reviewer") {
        if (!attendee.dsuId) {
          return status(403, "Access denied to this submission");
        }
        const assignments = await db.query.reviewerDsus.findMany({
          where: eq(reviewerDsus.userId, user.id),
        });
        if (!assignments.some((a) => a.dsuId === attendee.dsuId)) {
          return status(403, "Access denied to this submission");
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

      // Send email notification for status changes
      if (body.status && updated?.email && ["admitted", "waitlisted", "banned"].includes(body.status)) {
        const emailContent = getStatusEmailContent(body.status, updated.firstName);
        sendEmail(updated.email, emailContent.subject, emailContent.body).catch((err) =>
          console.error("[REVIEWER] Failed to send status email:", err)
        );
      }

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
