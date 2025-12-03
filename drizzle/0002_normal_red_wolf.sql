CREATE TABLE "interview_session" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"interview_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"evaluation" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "interview_answers" CASCADE;--> statement-breakpoint
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_candidate_id_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_interview_id_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interview"("id") ON DELETE cascade ON UPDATE no action;