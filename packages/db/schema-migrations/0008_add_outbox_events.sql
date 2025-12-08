-- 0008_add_outbox_events.sql
-- Adds polls.outbox_events table for the outbox pattern

CREATE SCHEMA IF NOT EXISTS polls;

CREATE TABLE IF NOT EXISTS polls.outbox_events (
  id serial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id integer,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  lock_owner text,
  locked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_published ON polls.outbox_events (published);
