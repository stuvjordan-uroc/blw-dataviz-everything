ALTER TABLE "polls"."sessions" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "polls"."sessions" ADD CONSTRAINT "sessions_slug_unique" UNIQUE("slug");