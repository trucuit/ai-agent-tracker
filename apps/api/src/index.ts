import "dotenv/config";
import express from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { createDb, repositories, repositoryStats, trendingSnapshots } from "@ai-tracker/db";
import { crawlAiAgentRepos } from "./github/crawler.js";
import { ingestRepositories } from "./services/ingestion.js";
import { computeAndStoreTrending } from "./services/trending.js";

const app = express();
const port = process.env.PORT ?? 3001;
const db = createDb(process.env.DATABASE_URL!);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/** GET /api/repositories?q=&language=&page=&limit= */
app.get("/api/repositories", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const language = typeof req.query.language === "string" ? req.query.language : undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (q) {
      conditions.push(
        or(
          ilike(repositories.name, `%${q}%`),
          ilike(repositories.description, `%${q}%`),
          ilike(repositories.fullName, `%${q}%`)
        )
      );
    }
    if (language) {
      conditions.push(eq(repositories.language, language));
    }

    const where = conditions.length > 0
      ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
      : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(repositories)
        .where(where)
        .orderBy(desc(repositories.stars))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(repositories)
        .where(where),
    ]);

    res.json({
      repositories: rows,
      total: Number(countResult[0]?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/trending?period=daily|weekly|monthly */
app.get("/api/trending", async (req, res) => {
  try {
    const period = ["daily", "weekly", "monthly"].includes(String(req.query.period))
      ? String(req.query.period)
      : "daily";

    // Get the latest snapshot date for this period
    const latestSnapshot = await db
      .select({ snapshotDate: trendingSnapshots.snapshotDate })
      .from(trendingSnapshots)
      .where(eq(trendingSnapshots.period, period))
      .orderBy(desc(trendingSnapshots.snapshotDate))
      .limit(1);

    if (!latestSnapshot[0]) {
      return res.json({ trending: [], period });
    }

    const snapshotDate = latestSnapshot[0].snapshotDate;

    // Get top 50 from the latest snapshot with repo data
    const rows = await db
      .select({
        rank: trendingSnapshots.rank,
        score: trendingSnapshots.score,
        period: trendingSnapshots.period,
        repository: repositories,
        stats: {
          stars: repositoryStats.stars,
          forks: repositoryStats.forks,
          watchers: repositoryStats.watchers,
          openIssues: repositoryStats.openIssues,
          starsGrowth1d: repositoryStats.starsGrowth1d,
          starsGrowth7d: repositoryStats.starsGrowth7d,
          starsGrowth30d: repositoryStats.starsGrowth30d,
          recordedAt: repositoryStats.recordedAt,
        },
      })
      .from(trendingSnapshots)
      .innerJoin(repositories, eq(trendingSnapshots.repositoryId, repositories.id))
      .leftJoin(
        repositoryStats,
        and(
          eq(repositoryStats.repositoryId, repositories.id),
          eq(
            repositoryStats.recordedAt,
            db
              .select({ max: sql`max(rs2.recorded_at)` })
              .from(sql`repository_stats rs2`)
              .where(sql`rs2.repository_id = ${repositories.id}`)
          )
        )
      )
      .where(eq(trendingSnapshots.period, period))
      .orderBy(trendingSnapshots.rank)
      .limit(50);

    res.json({ trending: rows, period, snapshotDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/repositories/:owner/:name */
app.get("/api/repositories/:owner/:name", async (req, res) => {
  try {
    const { owner, name } = req.params;
    const rows = await db
      .select()
      .from(repositories)
      .where(eq(repositories.fullName, `${owner}/${name}`))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repo = rows[0];

    // Get recent stats (last 30 days)
    const stats = await db
      .select()
      .from(repositoryStats)
      .where(eq(repositoryStats.repositoryId, repo.id))
      .orderBy(desc(repositoryStats.recordedAt))
      .limit(30);

    res.json({ repository: repo, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/sync — trigger a manual data sync (protected by SYNC_SECRET)
 */
app.post("/api/sync", async (req, res) => {
  const secret = process.env.SYNC_SECRET;
  if (secret && req.headers["x-sync-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({ message: "Sync started", timestamp: new Date().toISOString() });

  // Run sync in background
  runSync().catch((err) => console.error("Sync error:", err));
});

async function runSync() {
  console.log("Starting data sync...");
  const token = process.env.GITHUB_TOKEN;

  const { repos, topicCounts, durationMs } = await crawlAiAgentRepos(token);
  console.log(`Crawled ${repos.length} repos in ${durationMs}ms`, topicCounts);

  const result = await ingestRepositories(db, repos);
  console.log(`Ingestion complete: +${result.inserted} inserted, ~${result.updated} updated, ${result.errors} errors`);

  await computeAndStoreTrending(db);
  console.log("Trending snapshots updated.");
}

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
