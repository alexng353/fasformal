import { Elysia, t } from "elysia";
import { db } from "../../db";
import { attendees, years, dsus } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireAttendee } from "../auth/guards";

const tDsuType = t.Union([
  t.Literal("dsu"),
  t.Literal("alumni"),
  t.Literal("partner"),
]);

const tStudentStatus = t.Union([
  t.Literal("full_time"),
  t.Literal("part_time"),
  t.Literal("not_student"),
]);

export const formModule = new Elysia({ prefix: "/form" })
  .use(requireAttendee)

  // Get form state
  .get("/state", async ({ attendee }) => {
    const year = await db.query.years.findFirst({
      where: eq(years.id, attendee.yearId),
    });
    const dsuList = await db.query.dsus.findMany({
      where: eq(dsus.yearId, attendee.yearId),
      orderBy: (d, { asc }) => asc(d.name),
    });
    return {
      attendee,
      year: year
        ? {
            eventName: year.eventName,
            ticketPrice: year.ticketPrice,
            conditionalPricingEnabled: year.conditionalPricingEnabled,
            studentPrice: year.studentPrice,
            nonStudentPrice: year.nonStudentPrice,
            alumniPrice: year.alumniPrice,
            paymentEmail: year.paymentEmail,
            paymentDescriptionTemplate: year.paymentDescriptionTemplate,
            paymentDeadlineHours: year.paymentDeadlineHours,
            refundDeadline: year.refundDeadline?.toISOString() ?? null,
            submissionDeadline: year.submissionDeadline?.toISOString() ?? null,
            tosText: year.tosText,
            waiverLink: year.waiverLink,
            waiverSubmissionEmail: year.waiverSubmissionEmail,
          }
        : null,
      dsus: dsuList,
    };
  })

  // Get form settings (public-ish, just event info)
  .get("/settings", async ({ attendee }) => {
    const year = await db.query.years.findFirst({
      where: eq(years.id, attendee.yearId),
    });
    if (!year) return { error: "Year not found" };

    const dsuList = await db.query.dsus.findMany({
      where: eq(dsus.yearId, attendee.yearId),
      orderBy: (d, { asc }) => asc(d.name),
    });

    return {
      eventName: year.eventName,
      ticketPrice: year.ticketPrice,
      conditionalPricingEnabled: year.conditionalPricingEnabled,
      studentPrice: year.studentPrice,
      nonStudentPrice: year.nonStudentPrice,
      alumniPrice: year.alumniPrice,
      paymentEmail: year.paymentEmail,
      paymentDescriptionTemplate: year.paymentDescriptionTemplate,
      paymentDeadlineHours: year.paymentDeadlineHours,
      refundDeadline: year.refundDeadline?.toISOString() ?? null,
      submissionDeadline: year.submissionDeadline?.toISOString() ?? null,
      tosText: year.tosText,
      waiverLink: year.waiverLink,
      waiverSubmissionEmail: year.waiverSubmissionEmail,
      dsus: dsuList,
    };
  })

  // Update a form step
  .patch(
    "/step/:stepNumber",
    async ({ params, body, attendee, error }) => {
      const stepNum = parseInt(params.stepNumber);
      if (isNaN(stepNum) || stepNum < 1 || stepNum > 10) {
        return error(400, "Invalid step number");
      }

      // Can't skip ahead
      if (stepNum > attendee.currentStep) {
        return error(400, "Cannot skip ahead");
      }

      const update: Record<string, unknown> = { updatedAt: new Date() };

      switch (stepNum) {
        case 3: // DSU selection
          if (body.dsuType) update.dsuType = body.dsuType;
          if (body.dsuId !== undefined) {
            if (body.dsuId) {
              // Validate dsuId belongs to this attendee's year
              const dsu = await db.query.dsus.findFirst({
                where: eq(dsus.id, body.dsuId),
              });
              if (!dsu || dsu.yearId !== attendee.yearId) {
                return error(400, "Invalid DSU selection");
              }
            }
            update.dsuId = body.dsuId;
          }
          if (body.specifiedDsu !== undefined)
            update.specifiedDsu = body.specifiedDsu;
          break;

        case 4: // Personal info
          if (body.firstName) update.firstName = body.firstName;
          if (body.lastName) update.lastName = body.lastName;
          if (body.dateOfBirth) update.dateOfBirth = body.dateOfBirth;
          if (body.dietaryRestrictions !== undefined)
            update.dietaryRestrictions = body.dietaryRestrictions;
          if (body.studentStatus) update.studentStatus = body.studentStatus;
          if (body.emergencyContactName)
            update.emergencyContactName = body.emergencyContactName;
          if (body.emergencyContactPhone)
            update.emergencyContactPhone = body.emergencyContactPhone;
          break;

        case 5: // Partner info
          if (body.partnerStudentEmail !== undefined)
            update.partnerStudentEmail = body.partnerStudentEmail;
          if (body.partnerStudentFullName !== undefined)
            update.partnerStudentFullName = body.partnerStudentFullName;
          break;

        case 6: // TOS
          update.tosAccepted = body.tosAccepted ?? false;
          if (body.tosAccepted) update.tosAcceptedAt = new Date();
          break;

        case 7: // Waiver
          update.waiverCompleted = body.waiverCompleted ?? false;
          break;

        case 8: // Refund awareness
          update.refundAwarenessConfirmed =
            body.refundAwarenessConfirmed ?? false;
          break;

        case 9: // Refund date
          if (body.refundDateAnswer)
            update.refundDateAnswer = body.refundDateAnswer;
          break;

        case 10: { // Payment info + agreement
          update.paymentAgreed = body.paymentAgreed ?? false;
          if (body.paymentAgreed) {
            update.paymentAgreedAt = new Date();
            update.formCompleted = true;

            // Lock price
            const year = await db.query.years.findFirst({
              where: eq(years.id, attendee.yearId),
            });
            if (year) {
              if (year.conditionalPricingEnabled) {
                if (attendee.dsuType === "alumni") {
                  update.pricePaid = year.alumniPrice || year.ticketPrice;
                } else if (attendee.studentStatus === "not_student") {
                  update.pricePaid = year.nonStudentPrice || year.ticketPrice;
                } else {
                  update.pricePaid = year.studentPrice || year.ticketPrice;
                }
              } else {
                update.pricePaid = year.ticketPrice;
              }
            }
          }
          break;
        }
      }

      // Advance step if currently on this step
      if (stepNum === attendee.currentStep && stepNum < 10) {
        let nextStep = stepNum + 1;
        // Skip step 5 if not a partner
        if (nextStep === 5 && attendee.dsuType !== "partner") {
          nextStep = 6;
        }
        update.currentStep = nextStep;
      } else if (stepNum === 10) {
        update.currentStep = 10;
      }

      const [updated] = await db
        .update(attendees)
        .set(update)
        .where(eq(attendees.id, attendee.id))
        .returning();

      return updated;
    },
    {
      params: t.Object({ stepNumber: t.String() }),
      body: t.Object({
        // Step 3
        dsuType: t.Optional(tDsuType),
        dsuId: t.Optional(t.Nullable(t.String())),
        specifiedDsu: t.Optional(t.Nullable(t.String())),
        // Step 4
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        dateOfBirth: t.Optional(t.String()),
        dietaryRestrictions: t.Optional(t.Nullable(t.String())),
        studentStatus: t.Optional(tStudentStatus),
        emergencyContactName: t.Optional(t.String()),
        emergencyContactPhone: t.Optional(t.String()),
        // Step 5
        partnerStudentEmail: t.Optional(t.Nullable(t.String())),
        partnerStudentFullName: t.Optional(t.Nullable(t.String())),
        // Step 6
        tosAccepted: t.Optional(t.Boolean()),
        // Step 7
        waiverCompleted: t.Optional(t.Boolean()),
        // Step 8
        refundAwarenessConfirmed: t.Optional(t.Boolean()),
        // Step 9
        refundDateAnswer: t.Optional(t.String()),
        // Step 11
        paymentAgreed: t.Optional(t.Boolean()),
      }),
    }
  );
