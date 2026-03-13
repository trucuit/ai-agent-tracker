export const SUPPORTED_LANGUAGES = [
  "TypeScript",
  "Python",
  "JavaScript",
  "Go",
  "Rust",
  "Java",
  "C++",
  "C#",
  "Ruby",
  "Kotlin",
  "Swift",
  "Other",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const TRENDING_PERIODS = ["daily", "weekly", "monthly"] as const;

export type TrendingPeriod = (typeof TRENDING_PERIODS)[number];

export const AI_AGENT_TOPICS = [
  "ai-agent",
  "ai-agents",
  "llm-agent",
  "llm-agents",
  "autonomous-agent",
  "multi-agent",
  "agent-framework",
  "agentic-ai",
  "langchain",
  "langgraph",
  "autogen",
  "crewai",
] as const;
