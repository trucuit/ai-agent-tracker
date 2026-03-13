import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const repositories = pgTable(
  "repositories",
  {
    id: serial("id").primaryKey(),
    githubId: bigint("github_id", { mode: "number" }).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 511 }).notNull(),
    description: text("description"),
    url: text("url").notNull(),
    homepage: text("homepage"),
    language: varchar("language", { length: 100 }),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    stars: integer("stars").notNull().default(0),
    forks: integer("forks").notNull().default(0),
    watchers: integer("watchers").notNull().default(0),
    openIssues: integer("open_issues").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    isFork: boolean("is_fork").notNull().default(false),
    license: varchar("license", { length: 100 }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    pushedAt: timestamp("pushed_at").notNull(),
    indexedAt: timestamp("indexed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("repositories_github_id_idx").on(t.githubId)]
);

export const repositoryStats = pgTable(
  "repository_stats",
  {
    id: serial("id").primaryKey(),
    repositoryId: integer("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    stars: integer("stars").notNull(),
    forks: integer("forks").notNull(),
    watchers: integer("watchers").notNull(),
    openIssues: integer("open_issues").notNull(),
    starsGrowth1d: real("stars_growth_1d"),
    starsGrowth7d: real("stars_growth_7d"),
    starsGrowth30d: real("stars_growth_30d"),
  }
);

export const trendingSnapshots = pgTable("trending_snapshots", {
  id: serial("id").primaryKey(),
  period: varchar("period", { length: 20 }).notNull(), // daily | weekly | monthly
  rank: integer("rank").notNull(),
  score: real("score").notNull(),
  repositoryId: integer("repository_id")
    .notNull()
    .references(() => repositories.id, { onDelete: "cascade" }),
  snapshotDate: timestamp("snapshot_date").notNull().defaultNow(),
});
