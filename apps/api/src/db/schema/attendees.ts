import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { years } from "./years";
import { users } from "./users";
import { dsus } from "./dsus";

export const attendees = pgTable(
  "attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    yearId: uuid("year_id")
      .notNull()
      .references(() => years.id),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    firstName: text("first_name"),
    lastName: text("last_name"),

    dsuType: text("dsu_type", { enum: ["dsu", "alumni", "partner"] }),
    dsuId: uuid("dsu_id").references(() => dsus.id),
    specifiedDsu: text("specified_dsu"),

    dateOfBirth: date("date_of_birth"),
    dietaryRestrictions: text("dietary_restrictions"),
    studentStatus: text("student_status", {
      enum: ["full_time", "part_time", "not_student"],
    }),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),

    partnerStudentEmail: text("partner_student_email"),
    partnerStudentFullName: text("partner_student_full_name"),

    tosAccepted: boolean("tos_accepted").notNull().default(false),
    tosAcceptedAt: timestamp("tos_accepted_at", { withTimezone: true }),
    waiverCompleted: boolean("waiver_completed").notNull().default(false),
    refundAwarenessConfirmed: boolean("refund_awareness_confirmed")
      .notNull()
      .default(false),
    refundDateAnswer: text("refund_date_answer"),

    paymentAgreed: boolean("payment_agreed").notNull().default(false),
    paymentAgreedAt: timestamp("payment_agreed_at", { withTimezone: true }),
    pricePaid: numeric("price_paid", { precision: 10, scale: 2 }),

    confirmationNumber: text("confirmation_number").unique(),
    currentStep: integer("current_step").notNull().default(1),
    formCompleted: boolean("form_completed").notNull().default(false),

    status: text("status", {
      enum: ["pending", "verified", "paid", "banned", "waitlisted", "admitted"],
    })
      .notNull()
      .default("pending"),
    reviewedById: uuid("reviewed_by_id").references(() => users.id),
    reviewNote: text("review_note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("attendees_year_email").on(t.yearId, t.email)]
);
