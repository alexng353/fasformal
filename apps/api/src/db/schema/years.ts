import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";

export const years = pgTable("years", {
  id: uuid("id").primaryKey().defaultRandom(),
  year: integer("year").notNull().unique(),
  eventName: text("event_name").notNull(),
  ticketPrice: numeric("ticket_price", { precision: 10, scale: 2 }).notNull(),
  conditionalPricingEnabled: boolean("conditional_pricing_enabled")
    .notNull()
    .default(false),
  studentPrice: numeric("student_price", { precision: 10, scale: 2 }),
  nonStudentPrice: numeric("non_student_price", { precision: 10, scale: 2 }),
  alumniPrice: numeric("alumni_price", { precision: 10, scale: 2 }),
  paymentEmail: text("payment_email").notNull(),
  paymentDescriptionTemplate: text("payment_description_template").notNull(),
  paymentDeadlineHours: integer("payment_deadline_hours").notNull().default(48),
  refundDeadline: timestamp("refund_deadline", { withTimezone: true }),
  submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
  formSlug: text("form_slug"),
  tosText: text("tos_text").notNull(),
  waiverLink: text("waiver_link").notNull(),
  waiverSubmissionEmail: text("waiver_submission_email").notNull(),
  emailDomainRestriction: text("email_domain_restriction"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
