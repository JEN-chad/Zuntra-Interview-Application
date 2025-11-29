ALTER TABLE "booking" DROP CONSTRAINT "booking_recruiter_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "booking" ALTER COLUMN "recruiter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_recruiter_id_user_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;