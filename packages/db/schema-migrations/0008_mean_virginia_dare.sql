CREATE TABLE "polls"."outbox_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" integer,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"lock_owner" text,
	"locked_at" timestamp
);
