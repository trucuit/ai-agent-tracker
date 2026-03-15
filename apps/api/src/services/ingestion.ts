import { eq, sql, and, gte, lte } from "drizzle-orm";
import type { Db } from "@ai-tracker/db";
import { repositories, repositoryStats } from "@ai-tracker/db";
import type { GitHubRepo } from "../github/client.js";

export interface IngestionResult {
  inserted: number;
  updated: number;
  errors: number;
}

/**
 * Upsert a batch of repos and record new stats snapshots.
 */
export async function ingestRepositories(
  db: Db,
  repos: GitHubRepo[]
): Promise<IngestionResult> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const repo of repos) {
    try {
      const result = await db
        .insert(repositories)
        .values({
          githubId: repo.id,
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          url: repo.url,
          homepage: repo.homepage,
          language: repo.language,
          topics: repo.topics,
          stars: repo.stars,
          forks: repo.forks,
          watchers: repo.watchers,
          openIssues: repo.openIssues,
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          license: repo.license,
          createdAt: new Date(repo.createdAt),
          updatedAt: new Date(repo.updatedAt),
          pushedAt: new Date(repo.pushedAt),
          indexedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: repositories.githubId,
          set: {
            owner: sql`excluded.owner`,
            name: sql`excluded.name`,
            fullName: sql`excluded.full_name`,
            description: sql`excluded.description`,
            url: sql`excluded.url`,
            homepage: sql`excluded.homepage`,
            language: sql`excluded.language`,
            topics: sql`excluded.topics`,
            stars: sql`excluded.stars`,
            forks: sql`excluded.forks`,
            watchers: sql`excluded.watchers`,
            openIssues: sql`excluded.open_issues`,
            isArchived: sql`excluded.is_archived`,
            isFork: sql`excluded.is_fork`,
            license: sql`excluded.license`,
            updatedAt: sql`excluded.updated_at`,
            pushedAt: sql`excluded.pushed_at`,
            indexedAt: sql`now()`,
          },
        })
        .returning({ id: repositories.id, githubId: repositories.githubId });

      const dbRepo = result[0];
      if (!dbRepo) continue;

      // Check if this is a newly inserted row by querying for its stats
      const existingStats = await db
        .select({ id: repositoryStats.id })
        .from(repositoryStats)
        .where(eq(repositoryStats.repositoryId, dbRepo.id))
        .limit(1);

      if (existingStats.length === 0) {
        inserted++;
      } else {
        updated++;
      }

      // Record stats snapshot
      await recordStatsSnapshot(db, dbRepo.id, repo);
    } catch (err) {
      console.error(`Error ingesting repo ${repo.fullName}:`, err);
      errors++;
    }
  }

  return { inserted, updated, errors };
}

async function recordStatsSnapshot(
  db: Db,
  repositoryId: number,
  repo: GitHubRepo
): Promise<void> {
  const now = new Date();

  // Get stats from 1 day ago for growth calculation
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [stat1d, stat7d, stat30d] = await Promise.all([
    db
      .select({ stars: repositoryStats.stars })
      .from(repositoryStats)
      .where(
        and(
          eq(repositoryStats.repositoryId, repositoryId),
          gte(repositoryStats.recordedAt, oneDayAgo),
          lte(repositoryStats.recordedAt, now)
        )
      )
      .orderBy(repositoryStats.recordedAt)
      .limit(1),
    db
      .select({ stars: repositoryStats.stars })
      .from(repositoryStats)
      .where(
        and(
          eq(repositoryStats.repositoryId, repositoryId),
          gte(repositoryStats.recordedAt, sevenDaysAgo),
          lte(repositoryStats.recordedAt, oneDayAgo)
        )
      )
      .orderBy(repositoryStats.recordedAt)
      .limit(1),
    db
      .select({ stars: repositoryStats.stars })
      .from(repositoryStats)
      .where(
        and(
          eq(repositoryStats.repositoryId, repositoryId),
          gte(repositoryStats.recordedAt, thirtyDaysAgo),
          lte(repositoryStats.recordedAt, sevenDaysAgo)
        )
      )
      .orderBy(repositoryStats.recordedAt)
      .limit(1),
  ]);

  const starsGrowth1d = stat1d[0] ? repo.stars - stat1d[0].stars : null;
  const starsGrowth7d = stat7d[0] ? repo.stars - stat7d[0].stars : null;
  const starsGrowth30d = stat30d[0] ? repo.stars - stat30d[0].stars : null;

  await db.insert(repositoryStats).values({
    repositoryId,
    recordedAt: now,
    stars: repo.stars,
    forks: repo.forks,
    watchers: repo.watchers,
    openIssues: repo.openIssues,
    starsGrowth1d,
    starsGrowth7d,
    starsGrowth30d,
  });
}
