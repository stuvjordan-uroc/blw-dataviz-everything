CREATE SCHEMA "polls";
--> statement-breakpoint
CREATE SCHEMA "questions";
--> statement-breakpoint
CREATE TABLE "polls"."questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer,
	"varName" text NOT NULL,
	"batteryName" text NOT NULL,
	"subBattery" text,
	CONSTRAINT "questions_sessionId_varName_batteryName_subBattery_unique" UNIQUE("sessionId","varName","batteryName","subBattery")
);
--> statement-breakpoint
CREATE TABLE "polls"."respondents" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls"."responses" (
	"respondentId" integer NOT NULL,
	"questionSessionId" integer,
	"response" integer,
	CONSTRAINT "responses_respondentId_questionSessionId_unique" UNIQUE("respondentId","questionSessionId")
);
--> statement-breakpoint
CREATE TABLE "polls"."session_statistics" (
	"sessionId" integer PRIMARY KEY NOT NULL,
	"statistics" jsonb,
	"computed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "polls"."sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_config" jsonb,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
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
ALTER TABLE "polls"."questions" ADD CONSTRAINT "questions_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "polls"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls"."questions" ADD CONSTRAINT "questions_varName_batteryName_subBattery_questions_varName_batteryName_subBattery_fk" FOREIGN KEY ("varName","batteryName","subBattery") REFERENCES "questions"."questions"("varName","batteryName","subBattery") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls"."respondents" ADD CONSTRAINT "respondents_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "polls"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls"."responses" ADD CONSTRAINT "responses_respondentId_respondents_id_fk" FOREIGN KEY ("respondentId") REFERENCES "polls"."respondents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls"."responses" ADD CONSTRAINT "responses_questionSessionId_questions_id_fk" FOREIGN KEY ("questionSessionId") REFERENCES "polls"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls"."session_statistics" ADD CONSTRAINT "session_statistics_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "polls"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions"."questions" ADD CONSTRAINT "questions_batteryName_batteries_name_fk" FOREIGN KEY ("batteryName") REFERENCES "questions"."batteries"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions"."questions" ADD CONSTRAINT "questions_batteryName_subBattery_sub_batteries_batteryName_name_fk" FOREIGN KEY ("batteryName","subBattery") REFERENCES "questions"."sub_batteries"("batteryName","name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions"."sub_batteries" ADD CONSTRAINT "sub_batteries_batteryName_batteries_name_fk" FOREIGN KEY ("batteryName") REFERENCES "questions"."batteries"("name") ON DELETE no action ON UPDATE no action;