import { AI_AGENT_TOPICS } from "@ai-tracker/shared";
import { createGitHubClient, searchReposByTopic, type GitHubRepo } from "./client.js";

export interface CrawlResult {
  repos: GitHubRepo[];
  topicCounts: Record<string, number>;
  durationMs: number;
}

/**
 * Crawl GitHub for all AI agent repos across all configured topics.
 * Deduplicates by GitHub repo ID.
 */
export async function crawlAiAgentRepos(
  token?: string,
  maxPerTopic = 300
): Promise<CrawlResult> {
  const client = createGitHubClient(token);
  const start = Date.now();
  const seen = new Map<number, GitHubRepo>();
  const topicCounts: Record<string, number> = {};

  for (const topic of AI_AGENT_TOPICS) {
    console.log(`Crawling topic: ${topic}`);
    try {
      const repos = await searchReposByTopic(client, topic, maxPerTopic);
      topicCounts[topic] = repos.length;
      console.log(`  Found ${repos.length} repos for topic: ${topic}`);

      for (const repo of repos) {
        if (!seen.has(repo.id)) {
          seen.set(repo.id, repo);
        }
      }
    } catch (err) {
      console.error(`Error crawling topic ${topic}:`, err);
    }
  }

  const repos = Array.from(seen.values());
  const durationMs = Date.now() - start;

  console.log(`Crawl complete: ${repos.length} unique repos in ${durationMs}ms`);

  return { repos, topicCounts, durationMs };
}
