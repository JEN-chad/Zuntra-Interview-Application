ALTER TABLE "booking_hold" DROP CONSTRAINT "booking_hold_recruiter_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "booking_hold" ALTER COLUMN "recruiter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_hold" ADD CONSTRAINT "booking_hold_recruiter_id_user_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_id_interview_id_unique" UNIQUE("id","interview_id");