CREATE TABLE "polls"."session_visualizations" (
	"sessionId" integer NOT NULL,
	"visualization_id" text NOT NULL,
	"basis_split_indices" jsonb,
	"splits" jsonb,
	"computed_at" timestamp DEFAULT now(),
	CONSTRAINT "session_visualizations_sessionId_visualization_id_pk" PRIMARY KEY("sessionId","visualization_id")
);
--> statement-breakpoint
DROP TABLE "polls"."session_statistics" CASCADE;--> statement-breakpoint
ALTER TABLE "polls"."session_visualizations" ADD CONSTRAINT "session_visualizations_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "polls"."sessions"("id") ON DELETE no action ON UPDATE no action;