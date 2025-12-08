CREATE TABLE "polls"."outbox_dlq" (
	"id" serial PRIMARY KEY NOT NULL,
	"outboxId" integer,
	"stream_name" text,
	"stream_id" text,
	"event_type" text,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"failed_at" timestamp DEFAULT now()
);
