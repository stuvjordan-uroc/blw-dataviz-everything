ALTER TABLE "polls"."questions" ALTER COLUMN "subBattery" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "polls"."questions" ALTER COLUMN "subBattery" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions"."questions" ALTER COLUMN "subBattery" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "questions"."questions" ALTER COLUMN "subBattery" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "polls"."sessions" ADD COLUMN "is_open" boolean DEFAULT true NOT NULL;