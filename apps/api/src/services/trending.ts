import { desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@ai-tracker/db";
import { repositories, repositoryStats, trendingSnapshots } from "@ai-tracker/db";

interface ScoredRepo {
  repositoryId: number;
  score: number;
}

/**
 * Compute trending scores for daily/weekly/monthly periods and persist snapshots.
 *
 * Scoring formula (weighted sum):
 *   - Stars growth (primary signal): 60%
 *   - Absolute stars (popularity): 25%
 *   - Recency (recently pushed): 15%
 */
export async function computeAndStoreTrending(db: Db): Promise<void> {
  const periods: Array<{ period: "daily" | "weekly" | "monthly"; days: number }> = [
    { period: "daily", days: 1 },
    { period: "weekly", days: 7 },
    { period: "monthly", days: 30 },
  ];

  for (const { period, days } of periods) {
    const scored = await scoreRepos(db, days);
    if (scored.length === 0) continue;

    const snapshotDate = new Date();

    // Normalize scores to 0-100 range
    const maxScore = Math.max(...scored.map((r) => r.score), 1);
    const normalized = scored.map((r) => ({
      ...r,
      score: (r.score / maxScore) * 100,
    }));

    // Take top 100 repos
    const top = normalized.slice(0, 100);

    await db.insert(trendingSnapshots).values(
      top.map((r, i) => ({
        period,
        rank: i + 1,
        score: r.score,
        repositoryId: r.repositoryId,
        snapshotDate,
      }))
    );

    console.log(`Stored ${top.length} trending repos for period: ${period}`);
  }
}

async function scoreRepos(db: Db, days: number): Promise<ScoredRepo[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get all repos with their latest stats
  const rows = await db
    .select({
      id: repositories.id,
      stars: repositories.stars,
      pushedAt: repositories.pushedAt,
      starsGrowth1d: repositoryStats.starsGrowth1d,
      starsGrowth7d: repositoryStats.starsGrowth7d,
      starsGrowth30d: repositoryStats.starsGrowth30d,
      recordedAt: repositoryStats.recordedAt,
    })
    .from(repositories)
    .leftJoin(
      repositoryStats,
      eq(repositoryStats.repositoryId, repositories.id)
    )
    .where(
      sql`${repositoryStats.recordedAt} = (
        SELECT MAX(rs2.recorded_at)
        FROM repository_stats rs2
        WHERE rs2.repository_id = ${repositories.id}
      ) OR ${repositoryStats.id} IS NULL`
    )
    .orderBy(desc(repositories.stars));

  // Build score map (one entry per repo)
  const scored = new Map<number, ScoredRepo>();
  const now = Date.now();
  const maxAgeDays = 365; // repos not pushed in a year get 0 recency score

  for (const row of rows) {
    if (scored.has(row.id)) continue;

    // Stars growth signal (based on period)
    let growthSignal = 0;
    if (days === 1) growthSignal = row.starsGrowth1d ?? 0;
    else if (days === 7) growthSignal = row.starsGrowth7d ?? 0;
    else growthSignal = row.starsGrowth30d ?? 0;

    // Normalize growth (logarithmic to handle outliers)
    const growthScore = growthSignal > 0 ? Math.log10(growthSignal + 1) * 100 : 0;

    // Stars popularity score (logarithmic)
    const popularityScore = row.stars > 0 ? Math.log10(row.stars + 1) * 100 : 0;

    // Recency score based on last push date
    const pushedAgo = (now - new Date(row.pushedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, (1 - pushedAgo / maxAgeDays) * 100);

    const score = growthScore * 0.6 + popularityScore * 0.25 + recencyScore * 0.15;

    scored.set(row.id, { repositoryId: row.id, score });
  }

  return Array.from(scored.values()).sort((a, b) => b.score - a.score);
}
