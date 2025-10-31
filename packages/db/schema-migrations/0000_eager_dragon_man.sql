CREATE SCHEMA "questions";
--> statement-breakpoint
CREATE TABLE "questions"."batteries" (
	"name" text PRIMARY KEY NOT NULL,
	"prefix" text
);
--> statement-breakpoint
CREATE TABLE "questions"."questions" (
	"varName" text NOT NULL,
	"text" text,
	"batteryName" text NOT NULL,
	"subBattery" text,
	"responses" text[],
	CONSTRAINT "questions_varName_batteryName_subBattery_pk" PRIMARY KEY("varName","batteryName","subBattery")
);
--> statement-breakpoint
CREATE TABLE "questions"."sub_batteries" (
	"id" serial PRIMARY KEY NOT NULL,
	"batteryName" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "sub_batteries_batteryName_name_unique" UNIQUE("batteryName","name")
);
--> statement-breakpoint
ALTER TABLE "questions"."questions" ADD CONSTRAINT "questions_batteryName_batteries_name_fk" FOREIGN KEY ("batteryName") REFERENCES "questions"."batteries"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions"."questions" ADD CONSTRAINT "questions_batteryName_subBattery_sub_batteries_batteryName_name_fk" FOREIGN KEY ("batteryName","subBattery") REFERENCES "questions"."sub_batteries"("batteryName","name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions"."sub_batteries" ADD CONSTRAINT "sub_batteries_batteryName_batteries_name_fk" FOREIGN KEY ("batteryName") REFERENCES "questions"."batteries"("name") ON DELETE no action ON UPDATE no action;