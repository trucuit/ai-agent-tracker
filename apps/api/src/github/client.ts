import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

const ThrottledOctokit = Octokit.plugin(throttling);

export interface GitHubRepo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  isArchived: boolean;
  isFork: boolean;
  license: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}

export function createGitHubClient(token?: string) {
  return new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter: number, options: { method: string; url: string }, _octokit: unknown, retryCount: number) => {
        console.warn(`Rate limit hit for ${options.method} ${options.url}. Retry after ${retryAfter}s (attempt ${retryCount + 1})`);
        if (retryCount < 3) return true;
        return false;
      },
      onSecondaryRateLimit: (retryAfter: number, options: { method: string; url: string }) => {
        console.warn(`Secondary rate limit hit for ${options.method} ${options.url}. Waiting ${retryAfter}s`);
        return true;
      },
    },
  });
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;

function normalizeRepo(item: {
  id: number;
  owner?: { login?: string } | null;
  name?: string;
  full_name?: string;
  description?: string | null;
  html_url?: string;
  homepage?: string | null;
  language?: string | null;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  archived?: boolean;
  fork?: boolean;
  license?: { spdx_id?: string | null } | null;
  created_at?: string | null;
  updated_at?: string | null;
  pushed_at?: string | null;
}): GitHubRepo {
  return {
    id: item.id,
    owner: item.owner?.login ?? "",
    name: item.name ?? "",
    fullName: item.full_name ?? "",
    description: item.description ?? null,
    url: item.html_url ?? "",
    homepage: item.homepage ?? null,
    language: item.language ?? null,
    topics: item.topics ?? [],
    stars: item.stargazers_count ?? 0,
    forks: item.forks_count ?? 0,
    watchers: item.watchers_count ?? 0,
    openIssues: item.open_issues_count ?? 0,
    isArchived: item.archived ?? false,
    isFork: item.fork ?? false,
    license: item.license?.spdx_id ?? null,
    createdAt: item.created_at ?? new Date().toISOString(),
    updatedAt: item.updated_at ?? new Date().toISOString(),
    pushedAt: item.pushed_at ?? new Date().toISOString(),
  };
}

/**
 * Search GitHub for repos matching a topic query.
 * Returns up to maxResults repos, handling pagination automatically.
 */
export async function searchReposByTopic(
  client: GitHubClient,
  topic: string,
  maxResults = 500
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  const perPage = 100;
  const maxPages = Math.ceil(Math.min(maxResults, 1000) / perPage);

  for (let page = 1; page <= maxPages; page++) {
    const { data } = await client.search.repos({
      q: `topic:${topic}`,
      sort: "stars",
      order: "desc",
      per_page: perPage,
      page,
    });

    for (const item of data.items) {
      repos.push(normalizeRepo(item));
    }

    if (data.items.length < perPage) break;
    if (repos.length >= maxResults) break;
  }

  return repos;
}

/**
 * Fetch fresh data for a single repo by owner/name.
 */
export async function fetchRepo(
  client: GitHubClient,
  owner: string,
  name: string
): Promise<GitHubRepo> {
  const { data } = await client.repos.get({ owner, repo: name });
  return normalizeRepo(data);
}
