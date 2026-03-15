-- Initial schema for AI Agent Tracker

CREATE TABLE IF NOT EXISTS "repositories" (
  "id" serial PRIMARY KEY,
  "github_id" bigint NOT NULL,
  "owner" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "full_name" varchar(511) NOT NULL,
  "description" text,
  "url" text NOT NULL,
  "homepage" text,
  "language" varchar(100),
  "topics" jsonb NOT NULL DEFAULT '[]',
  "stars" integer NOT NULL DEFAULT 0,
  "forks" integer NOT NULL DEFAULT 0,
  "watchers" integer NOT NULL DEFAULT 0,
  "open_issues" integer NOT NULL DEFAULT 0,
  "is_archived" boolean NOT NULL DEFAULT false,
  "is_fork" boolean NOT NULL DEFAULT false,
  "license" varchar(100),
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "pushed_at" timestamp NOT NULL,
  "indexed_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "repositories_github_id_idx" ON "repositories" ("github_id");

CREATE TABLE IF NOT EXISTS "repository_stats" (
  "id" serial PRIMARY KEY,
  "repository_id" integer NOT NULL REFERENCES "repositories"("id") ON DELETE CASCADE,
  "recorded_at" timestamp NOT NULL DEFAULT now(),
  "stars" integer NOT NULL,
  "forks" integer NOT NULL,
  "watchers" integer NOT NULL,
  "open_issues" integer NOT NULL,
  "stars_growth_1d" real,
  "stars_growth_7d" real,
  "stars_growth_30d" real
);

CREATE INDEX IF NOT EXISTS "repository_stats_repo_id_idx" ON "repository_stats" ("repository_id");
CREATE INDEX IF NOT EXISTS "repository_stats_recorded_at_idx" ON "repository_stats" ("recorded_at");

CREATE TABLE IF NOT EXISTS "trending_snapshots" (
  "id" serial PRIMARY KEY,
  "period" varchar(20) NOT NULL,
  "rank" integer NOT NULL,
  "score" real NOT NULL,
  "repository_id" integer NOT NULL REFERENCES "repositories"("id") ON DELETE CASCADE,
  "snapshot_date" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "trending_snapshots_period_date_idx" ON "trending_snapshots" ("period", "snapshot_date");
