export type AspectSlug =
  | "product-service"
  | "customers-distribution"
  | "business-model"
  | "operations"
  | "people-organization"
  | "mission-principles-culture"
  | "finance-capital";

export interface Action {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "suggested" | "planned" | "active" | "done";
  agentCapable: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  schedule?: string;
  parameters: Record<string, unknown>;
}

export interface System {
  id: string;
  title: string;
  type: "sop" | "automation";
  playbook?: string;
  agentConfig?: AgentConfig;
}

export interface BusinessAspect {
  slug: AspectSlug;
  title: string;
  summary: string;
  actions: Action[];
  systems: System[];
  rawMarkdown: string;
}

// ---------------------------------------------------------------------------
// Persisted business entities (mirrors Prisma models for frontend use)
// ---------------------------------------------------------------------------

export interface BusinessPlanEntity {
  id: string;
  businessId: string;
  aspectSlug: string;
  title: string;
  summary: string;
  actions: Action[];
  systems: System[];
  rawMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoEntity {
  id: string;
  businessId: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "done";
  aspectSlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessEntity {
  id: string;
  userId: string;
  name: string;
  description: string;
  stage: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
  sourceSessionId: string | null;
  plans: BusinessPlanEntity[];
  todos: TodoEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessExtractionAspect {
  aspectSlug: AspectSlug;
  title: string;
  summary: string;
  actions: Omit<Action, "id">[];
  systems: Omit<System, "id">[];
  rawMarkdown: string;
}

export interface BusinessExtraction {
  name: string;
  description: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
  aspects: BusinessExtractionAspect[];
}

// ---------------------------------------------------------------------------
// Business update patch (returned by the AI update endpoint)
// ---------------------------------------------------------------------------

export interface BusinessUpdatePatch {
  businessFields?: Partial<
    Pick<BusinessEntity, "name" | "description" | "industry" | "targetCustomer" | "valueProposition" | "revenueModel">
  >;
  plans?: {
    aspectSlug: AspectSlug;
    summary?: string;
    actions?: Omit<Action, "id">[];
    systems?: Omit<System, "id">[];
    rawMarkdown?: string;
  }[];
  todosToAdd?: {
    title: string;
    description?: string;
    priority?: "high" | "medium" | "low";
    aspectSlug: AspectSlug;
  }[];
  todosToUpdate?: { id: string; status: "pending" | "done" }[];
  todosToRemove?: string[];
  changeSummary: string;
}

// ---------------------------------------------------------------------------
// Static aspect definitions (knowledge-base file mapping)
// ---------------------------------------------------------------------------

export const ASPECT_DEFINITIONS: {
  slug: AspectSlug;
  title: string;
  file: string;
}[] = [
  {
    slug: "product-service",
    title: "Product or Service",
    file: "1.Founder's Notes - Product or Service (the value delivered).md",
  },
  {
    slug: "customers-distribution",
    title: "Customers & Distribution",
    file: "2.Founder's Notes - Customers + distribution (how value reaches people).md",
  },
  {
    slug: "business-model",
    title: "Business Model",
    file: "3.Founder's Notes - Business model (how you get paid + unit economics).md",
  },
  {
    slug: "operations",
    title: "Operations",
    file: "4.Founder's Notes - Operations (delivery, cost structure, and \"the machine\").md",
  },
  {
    slug: "people-organization",
    title: "People & Organization",
    file: "5.Founder's Notes - People + organization (who does the work, and how you coordinate).md",
  },
  {
    slug: "mission-principles-culture",
    title: "Mission, Principles & Culture",
    file: "6.Founder's Notes - Mission, principles, and culture (the \"constitution\" of the company).md",
  },
  {
    slug: "finance-capital",
    title: "Finance & Capital Allocation",
    file: "7.Founder's Notes - Finance + capital allocation (staying alive and compounding).md",
  },
];
