import type { AttendeeStatus, DsuType, StudentStatus, UserRole } from "./enums";

export interface Year {
  id: string;
  year: number;
  eventName: string;
  ticketPrice: string;
  conditionalPricingEnabled: boolean;
  studentPrice: string | null;
  nonStudentPrice: string | null;
  alumniPrice: string | null;
  paymentEmail: string;
  paymentDescriptionTemplate: string;
  paymentDeadlineHours: number;
  refundDeadline: string | null;
  tosText: string;
  waiverLink: string;
  waiverSubmissionEmail: string;
  emailDomainRestriction: string | null;
  isActive: boolean;
}

export interface Dsu {
  id: string;
  yearId: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Attendee {
  id: string;
  yearId: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  dsuType: DsuType | null;
  dsuId: string | null;
  specifiedDsu: string | null;
  dateOfBirth: string | null;
  dietaryRestrictions: string | null;
  studentStatus: StudentStatus | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  partnerStudentEmail: string | null;
  partnerStudentFullName: string | null;
  tosAccepted: boolean;
  tosAcceptedAt: string | null;
  waiverCompleted: boolean;
  refundAwarenessConfirmed: boolean;
  refundDateAnswer: string | null;
  paymentAgreed: boolean;
  paymentAgreedAt: string | null;
  pricePaid: string | null;
  confirmationNumber: string | null;
  currentStep: number;
  formCompleted: boolean;
  status: AttendeeStatus;
  reviewedById: string | null;
  reviewNote: string | null;
}
