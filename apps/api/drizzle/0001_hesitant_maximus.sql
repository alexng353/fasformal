ALTER TABLE "years" ADD COLUMN "submission_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "years" ADD COLUMN "form_slug" text;--> statement-breakpoint
ALTER TABLE "email_codes" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;