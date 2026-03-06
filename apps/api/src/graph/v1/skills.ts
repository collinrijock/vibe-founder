import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export type SkillName =
  | "product_service"
  | "customers_distribution"
  | "business_model"
  | "operations"
  | "people_organization"
  | "mission_culture"
  | "finance_capital";

export const SKILL_INDEX = `Available skills (load with loadSkill before responding on unfamiliar domains):
- product_service: Product design, service-first philosophy, competitive positioning, quality standards, iteration loops
- customers_distribution: Customer acquisition, distribution strategy, ICP definition, trust-building, feedback loops, CAC/LTV
- business_model: Pricing strategy, unit economics, cash timing, reinvestment, avoiding commodity traps
- operations: Cost discipline, SOPs, cycle time, WIP limits, scaling thresholds, operational metrics
- people_organization: Hiring standards, org shape, incentive alignment, accountability loops, truth flow
- mission_culture: Mission writing, principles as decision rules, behavioral encoding, culture mechanisms, storytelling
- finance_capital: Capital allocation, balance sheet resilience, expense discipline, staged bets, independence thresholds
`;

const SKILLS: Record<SkillName, string> = {
  product_service: `## Product & Service Skill

### When to use
Load when the user asks about their product, service design, value proposition, quality, competitive advantage, or iteration strategy.

### Tool usage patterns
- Use searchNotes with aspectFilter="product-service" for specific product questions
- Use loadAspect with aspect="product-service" for full context
- Use identifyGaps with aspect="product-service" for what's missing

### Domain guardrails
- Always anchor on "service first, profit is a result" — don't let advice prioritize revenue over customer value
- Push for specifics: "What's your one-sentence service promise?" "What's your secret?"
- Encourage evidence-based iteration: test -> measure -> record -> improve
- Quality is non-negotiable: help them define 1-3 quality bars

### Key frameworks
1. Service-first philosophy (Ford, Ogilvy): prioritize service; profit follows
2. Domain mastery: know the full chain end-to-end before scaling
3. Meaningful differentiation: "only we can do this" advantage (Zero to One secret)
4. Unrelentingly high standards: 1-3 non-negotiable quality bars
5. Evidence-based iteration: weekly experiments, product log
6. Customers as contributors: persistent feedback mechanisms
7. Focus: single product bet, say no to the rest`,

  customers_distribution: `## Customers & Distribution Skill

### When to use
Load when the user asks about customers, acquisition, distribution channels, marketing, growth, retention, or their ICP.

### Tool usage patterns
- Use searchNotes with aspectFilter="customers-distribution" for specific customer questions
- Use loadAspect with aspect="customers-distribution" for full context
- Use prioritizeActions with aspect="customers-distribution" for action ranking

### Domain guardrails
- Always reference the user's actual ICP, not generic personas
- "One distribution strategy usually dominates all others" — push for depth over breadth
- Prioritize distribution experiments over theory
- The best product with no distribution loses to a decent product with great distribution

### Key frameworks
1. Service above profit: exceptional service makes distribution cheaper over time
2. Front-line obsession: time at customer friction points, Top 10 frictions list
3. One primary channel: depth beats scattered activity; single metric to prove it works
4. Trust as product feature: guarantees, risk-reversal, speed
5. Believers not buyers: identity traits, community rituals, cult-like following
6. Fast loops: weekly distribution experiments, funnel scorecard
7. Distribution as OS: playbooks for what works, standardize repeatable parts`,

  business_model: `## Business Model Skill

### When to use
Load when the user asks about pricing, unit economics, revenue model, margins, cash flow, or competitive positioning.

### Tool usage patterns
- Use searchNotes with aspectFilter="business-model" for pricing/economics questions
- Use loadAspect with aspect="business-model" for full context
- Use identifyGaps with aspect="business-model" for what's missing

### Domain guardrails
- Push for a 1-page "money map": who pays, for what, when, how often, why now
- Avoid commodity competition: if the pitch is "same as X but cheaper" without structural advantage, flag it
- CAC must be experiment-driven, not a guess
- "Don't scale what you haven't proven makes money"

### Key frameworks
1. Value capture: creating value isn't enough; must capture some (money map)
2. Avoid commodity: define the "secret" — structural reason you can win
3. Unit economics (5 weekly numbers): gross margin, CAC, payback period, retention, cash conversion cycle
4. Fast iteration: 2-week hypothesis -> test -> measure -> keep/kill loops
5. Distribution is first-class: one primary channel, funnel math on one page
6. Cash stress survival: basic controls early, don't scale unproven economics
7. Explicit reinvestment: reinvest in what works until returns fall
8. Written tradeoff principles: 5-10 business model principles for quick decisions`,

  operations: `## Operations Skill

### When to use
Load when the user asks about delivery, processes, SOPs, cost structure, scaling, efficiency, or operational metrics.

### Tool usage patterns
- Use searchNotes with aspectFilter="operations" for specific ops questions
- Use loadAspect with aspect="operations" for full context
- Use identifyGaps with aspect="operations" to find operational gaps

### Domain guardrails
- Simplicity is the goal: "What are we deleting to keep the system simple?"
- Every new process/SKU/feature must justify its complexity cost
- Scale only what's stable: minimum thresholds before scaling volume
- Operations = coordination; miscommunication = rework

### Key frameworks
1. Few variables that matter: 3-5 operating metrics with single owners
2. Simple-by-design machine: standardize "one best way," one-page docs
3. Written execution: Five Ws + why for every task, explicit handoffs
4. Information > inventory: track cycle time, limit WIP, visible queues
5. Ruthless cost discipline: "every dollar has a job," monthly expense review
6. Tactical planning: short loops (this week + next steps), small reversible experiments
7. Scale only what's stable: on-time > X, defects < Y, margin > Z before scaling
8. Operator scorekeeping: weekly "What improved? What shipped? What broke? What learned?"`,

  people_organization: `## People & Organization Skill

### When to use
Load when the user asks about hiring, team structure, org design, incentives, accountability, or management.

### Tool usage patterns
- Use searchNotes with aspectFilter="people-organization" for people questions
- Use loadAspect with aspect="people-organization" for full context
- Use prioritizeActions with aspect="people-organization" for hiring/org priorities

### Domain guardrails
- Founder behavior is the organizational ceiling — address this first
- "Hire up, not down" — never negotiate with mediocrity
- Always ask: "How does this person/team win if the company wins?"
- Truth flow: bad news must travel faster than good news

### Key frameworks
1. Founder standard: intensity becomes the ceiling; define "excellent" and "not tolerated"
2. Talent density: 3 non-negotiable traits per role, no compromises (240 hitters problem)
3. Owner incentives: treat key people as partners, share upside, align economics
4. Small teams + decentralized command: ~12 for execution, ~150 for cohesion, push decisions down
5. Truth flow: unfiltered channels, welcome bad news, reward problem-surfacing
6. Simple accountability: workstreams with named owners, weekly review (priorities/blocked/decisions/owners)
7. Anti-bloat: quarterly prune meetings/processes that don't pay for themselves`,

  mission_culture: `## Mission, Principles & Culture Skill

### When to use
Load when the user asks about mission, values, culture, principles, hiring for fit, or organizational identity.

### Tool usage patterns
- Use searchNotes with aspectFilter="mission-principles-culture" for culture questions
- Use loadAspect with aspect="mission-principles-culture" for full context
- Use identifyGaps with aspect="mission-principles-culture" for culture gaps

### Domain guardrails
- Mission must be usable by any employee to decide "what to do next" without the founder
- Principles must be decision rules, not slogans ("customer obsession beats short-term margin" not "we care about customers")
- Culture is who you let in: hiring bar is the primary culture lever
- The founder can't outsource culture formation early — behavior > words

### Key frameworks
1. Plain-language mission: names the customer and the standard, usable for decisions
2. Principles as decision rules: 5-12 principles, each a tradeoff resolver, service before profit
3. Observable behaviors: for each principle, "We do" (3-5) + "We don't" (3-5 anti-patterns)
4. Founder as culture: do interviews, read customer emails, repeat same ideas for years
5. Mechanisms over memos: meeting formats, writing standards, hiring bars, spending rules
6. Mission-fit hiring: test for genuine commitment to your specific mission, protect high bar
7. Storytelling + concreteness: 10-20 company stories demonstrating principles, "what do we have to show for it?"`,

  finance_capital: `## Finance & Capital Allocation Skill

### When to use
Load when the user asks about finances, capital allocation, fundraising, cash management, spending, or financial benchmarks.

### Tool usage patterns
- Use searchNotes with aspectFilter="finance-capital" for finance questions
- Use loadAspect with aspect="finance-capital" for full context
- Use identifyGaps with aspect="finance-capital" for financial blind spots

### Domain guardrails
- Survival is priority #1: "don't get knocked out" balance sheet
- Fiscal complacency kills companies (NeXT example)
- Every meaningful spend needs an investment memo: upside, downside, time-to-feedback, alternatives
- "Only concern yourself with controllables; the rest is a waste of time"

### Key frameworks
1. Durability > optics: optimize for decades, not quarters; write a capital allocation policy
2. Don't-get-knocked-out balance sheet: hard limits on fixed obligations under bad-case scenario
3. Relentless economy: monthly expense audit, tie every hire/tool to measurable output in 30-90 days
4. Opportunity cost allocation: investment memo template for meaningful spend
5. Aggressive experimentation without company risk: staged tranches, predefined kill criteria
6. Tactical feedback loops: weekly cash + runway check, quarterly reallocation
7. Independence threshold: explicit conditions for rejecting acquisition
8. Dashboard of controllables: cash, margins, receivables, churn, hiring pace, CAC payback`,

};

export function getSkillContent(name: string): string | null {
  const content = SKILLS[name as SkillName];
  return content ?? null;
}

export function createLoadSkillTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "loadSkill",
    description:
      "Loads domain-specific expertise and tool usage patterns for a business area. Load the relevant skill BEFORE responding on any domain you need deeper context on.",
    schema: z.object({
      skill_name: z
        .enum([
          "product_service",
          "customers_distribution",
          "business_model",
          "operations",
          "people_organization",
          "mission_culture",
          "finance_capital",
        ])
        .describe("The skill to load"),
    }),
    func: async ({ skill_name }) => {
      const content = getSkillContent(skill_name);
      if (!content) {
        return JSON.stringify({ error: `Skill "${skill_name}" not found` });
      }
      return content;
    },
  });
}
