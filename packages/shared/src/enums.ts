export const UserRole = {
  ADMIN: "admin",
  REVIEWER: "reviewer",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DsuType = {
  DSU: "dsu",
  ALUMNI: "alumni",
  PARTNER: "partner",
} as const;
export type DsuType = (typeof DsuType)[keyof typeof DsuType];

export const StudentStatus = {
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  NOT_STUDENT: "not_student",
} as const;
export type StudentStatus = (typeof StudentStatus)[keyof typeof StudentStatus];

export const AttendeeStatus = {
  PENDING: "pending",
  VERIFIED: "verified",
  PAID: "paid",
  BANNED: "banned",
  WAITLISTED: "waitlisted",
  ADMITTED: "admitted",
} as const;
export type AttendeeStatus =
  (typeof AttendeeStatus)[keyof typeof AttendeeStatus];

export const FORM_STEPS = {
  NAME_EMAIL: 1,
  VERIFY_OTP: 2,
  DSU_SELECTION: 3,
  PERSONAL_INFO: 4,
  PARTNER_INFO: 5,
  TOS: 6,
  WAIVER: 7,
  REFUND_AWARENESS: 8,
  REFUND_DATE: 9,
  PAYMENT_AGREEMENT: 10,
} as const;

export const TOTAL_FORM_STEPS = 10;
