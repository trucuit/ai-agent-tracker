export interface Repository {
  id: number;
  githubId: number;
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
  indexedAt: string;
}

export interface RepositoryStats {
  repositoryId: number;
  recordedAt: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  starsGrowth1d: number | null;
  starsGrowth7d: number | null;
  starsGrowth30d: number | null;
}

export interface TrendingEntry {
  period: "daily" | "weekly" | "monthly";
  rank: number;
  score: number;
  repository: Repository;
  stats: RepositoryStats | null;
}
