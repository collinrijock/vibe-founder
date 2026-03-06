export type AgentStatus = "idle" | "running" | "completed" | "failed";
export type AgentType = "one-shot" | "scheduled" | "always-on";

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  aspectSlug: string;
  type: AgentType;
  provider: string;
  available: boolean;
  parameters?: AgentParameterDef[];
}

export interface AgentParameterDef {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required: boolean;
  default?: string | number | boolean;
}

export interface AgentRun {
  id: string;
  agentId: string;
  status: AgentStatus;
  startedAt: string;
  completedAt?: string;
  result?: string;
  error?: string;
}

export const AGENT_CATALOG: AgentDefinition[] = [
  {
    id: "competitor-researcher",
    name: "Competitor Researcher",
    description:
      "Finds and profiles competitors based on your business, updates your competitive landscape with positioning, strengths, and weaknesses.",
    aspectSlug: "product-service",
    type: "one-shot",
    provider: "internal",
    available: true,
    parameters: [
      {
        name: "focusArea",
        type: "string",
        description: "Specific area to research (e.g. 'pricing', 'features', 'market positioning')",
        required: false,
      },
      {
        name: "maxCompetitors",
        type: "number",
        description: "Maximum number of competitors to research",
        required: false,
        default: 5,
      },
    ],
  },
  {
    id: "content-drafter",
    name: "Content Drafter",
    description:
      "Drafts content (blog posts, social posts, email sequences) aligned with your brand voice, ICP, and positioning.",
    aspectSlug: "customers-distribution",
    type: "one-shot",
    provider: "internal",
    available: true,
    parameters: [
      {
        name: "contentType",
        type: "string",
        description: "Type of content: 'blog_post', 'social_post', 'email_sequence', 'landing_page'",
        required: true,
      },
      {
        name: "topic",
        type: "string",
        description: "Topic or subject for the content",
        required: true,
      },
      {
        name: "tone",
        type: "string",
        description: "Override tone (defaults to Business DNA voice)",
        required: false,
      },
    ],
  },
  {
    id: "lead-researcher",
    name: "Lead Researcher",
    description:
      "Researches potential customers and leads matching your ICP, with company profiles and outreach angles.",
    aspectSlug: "customers-distribution",
    type: "one-shot",
    provider: "internal",
    available: true,
    parameters: [
      {
        name: "industry",
        type: "string",
        description: "Target industry to search",
        required: false,
      },
      {
        name: "location",
        type: "string",
        description: "Geographic focus for leads",
        required: false,
      },
      {
        name: "maxLeads",
        type: "number",
        description: "Maximum number of leads to find",
        required: false,
        default: 10,
      },
    ],
  },
  {
    id: "lead-sourcer",
    name: "Lead Sourcer",
    description:
      "Scrapes LinkedIn and other platforms to find potential leads matching your ICP.",
    aspectSlug: "customers-distribution",
    type: "scheduled",
    provider: "apify",
    available: false,
  },
  {
    id: "candidate-finder",
    name: "Candidate Finder",
    description:
      "Sources candidates on LinkedIn based on your role requirements and culture fit.",
    aspectSlug: "people-organization",
    type: "scheduled",
    provider: "apify",
    available: false,
  },
  {
    id: "competitor-monitor",
    name: "Competitor Monitor",
    description:
      "Tracks competitor product changes, pricing, and positioning across the web.",
    aspectSlug: "product-service",
    type: "scheduled",
    provider: "apify",
    available: false,
  },
  {
    id: "content-researcher",
    name: "Content Researcher",
    description:
      "Researches trending topics and content opportunities in your market.",
    aspectSlug: "customers-distribution",
    type: "one-shot",
    provider: "apify",
    available: false,
  },
  {
    id: "financial-benchmarker",
    name: "Financial Benchmarker",
    description:
      "Collects public financial benchmarks and unit economics from similar businesses.",
    aspectSlug: "finance-capital",
    type: "one-shot",
    provider: "apify",
    available: false,
  },
  {
    id: "ops-auditor",
    name: "Operations Auditor",
    description:
      "Analyzes your operational workflows and suggests improvements based on best practices.",
    aspectSlug: "operations",
    type: "one-shot",
    provider: "internal",
    available: false,
  },
];
