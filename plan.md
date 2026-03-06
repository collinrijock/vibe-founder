# Vibe Founder — The Cursor for Business

## Vision

What Cursor is for programmers, Vibe Founder is for solopreneurs. A context-rich workspace where your entire business is deeply understood by AI agents that can plan, analyze, and execute across every domain — not just chat about it.

### The Cursor Parallel

| Cursor for Code | Vibe Founder for Business |
|---|---|
| Codebase is indexed and semantically searchable | Business state is indexed and semantically searchable |
| Agents read, write, and refactor code | Agents read, analyze, and execute business operations |
| Multi-file editing across the project | Multi-domain action across the business |
| Terminal for running commands | Integrations for executing real-world actions (email, invoices, social) |
| Checkpoints for safe rollback | Decision logs for accountability and learning |
| `.cursorrules` for project-specific AI behavior | Business DNA (principles, voice, strategy) shapes all AI behavior |
| `@file` and `@codebase` context mentions | `@competitors`, `@pipeline`, `@finances` context mentions |
| Command palette (Cmd+K) for quick actions | Command palette for business actions |
| Activity bar + sidebar + editor + panel | Activity bar + sidebar + workspace + context panel |
| Background agents running on codebase copies | Background agents monitoring competitors, leads, content |

---

## Part 1: The Business Context Engine

In Cursor, the codebase IS the context. In Vibe Founder, the business IS the context.

### Business State Graph

Everything the AI does draws from a living, structured representation of the business:

```
Business DNA
├── Identity (name, mission, principles, voice, brand guidelines)
├── Strategy
│   ├── Product/Service (offerings, roadmap, positioning)
│   ├── Customers (ICP, segments, personas, journey maps)
│   ├── Business Model (pricing, unit economics, revenue streams)
│   └── Competitive Landscape (competitors, differentiation)
├── Operations
│   ├── Processes (SOPs, workflows, playbooks)
│   ├── Tools & Integrations (connected accounts, APIs)
│   ├── Finances (P&L, cash flow, budgets, actuals)
│   └── Legal (entity, contracts, compliance)
├── Execution
│   ├── Active Initiatives (projects with milestones)
│   ├── Agent Assignments (what's running, what's scheduled)
│   ├── Content Calendar (planned, drafted, published)
│   └── Pipeline (leads, deals, customers)
└── History
    ├── Decision Log (what was decided, why, outcome)
    ├── Metrics Over Time (KPIs, trends)
    └── Update Feed (all changes, who/what made them)
```

Every agent, every conversation, every action reads from and writes back to this graph. The entire graph is vector-indexed for semantic search — when a founder asks "how are we doing on customer acquisition?", the system pulls from pipeline data, marketing metrics, content performance, AND the strategic plan simultaneously.

### @ Mention Context System

Like Cursor's `@file` and `@codebase`, users can inject business context anywhere:

- `@competitors` — pulls competitive landscape data
- `@pipeline` — pulls sales/lead pipeline
- `@finances` — pulls financial state
- `@[customer-name]` — pulls that customer's history
- `@[initiative-name]` — pulls initiative context
- `@plan` — pulls the full business plan
- `@voice` — pulls brand voice guidelines

These work in the main chat, the command palette, and inside any agent configuration.

---

## Part 2: The Agent System

### Agent Types

| Type | Description | Examples |
|---|---|---|
| **Background** | Always-on monitors that watch and alert | Competitor price monitor, review sentiment tracker, cash flow alert |
| **Task** | One-shot execution on demand | "Draft a cold email sequence", "Analyze this month's P&L" |
| **Workflow** | Multi-step processes with checkpoints | Lead qualification pipeline, content creation → review → publish |
| **Orchestrator** | The copilot itself — delegates to specialists | Understands the full business, routes to the right agent |

### Agent Capabilities

1. **Read the Business** — Every agent has access to the full Business State Graph. A content agent knows your brand voice, ICP, and positioning before writing a word.
2. **Use External Tools** — Real integrations via Composio (details in Part 4).
3. **Write Back** — Agents update the living business state: add leads, mark content published, update projections.
4. **Compose** — Chain agents: Research → Draft → Review → Publish. Like Cursor agents working on different files simultaneously.

### First 3 Agents to Ship

1. **Competitor Researcher** — Given the business, finds and profiles competitors, updates competitive landscape in business state.
2. **Content Drafter** — Given ICP, brand voice, and a topic, drafts content (blog posts, social posts, emails).
3. **Lead Researcher** — Given ICP, finds potential customers/leads with contact info.

---

## Part 3: The Workspace UI (Cursor-Like Redesign)

### Current State

The app is a standard chat-first layout:
- Fixed 256px sidebar (threads + businesses + nav)
- Single main content area (chat OR dashboard OR agents — one at a time)
- No resizable panels, no multi-pane views, no activity bar
- No command palette
- No persistent agent visibility
- Dark zinc theme, borderless/flat aesthetic

### Target State: IDE-Like Workspace

The redesign transforms the app from "chat app with a sidebar" into a "business workspace with intelligent panels."

### 3.1 Layout Architecture

```
┌──┬────────────┬──────────────────────────────┬─────────────────┐
│  │            │                              │                 │
│  │  PRIMARY   │     MAIN WORKSPACE           │  CONTEXT PANEL  │
│A │  SIDEBAR   │                              │                 │
│C │            │  (dynamic — shows what       │  • Business DNA │
│T │  • Search  │   you're working on)         │  • Related docs │
│I │  • Threads │                              │  • Agent output │
│V │  • Business│  Could be:                   │  • Metrics      │
│I │    Aspects │  - Copilot chat              │  • Suggestions  │
│T │  • Initia- │  - Split: chat + plan view   │                 │
│Y │    tives   │  - Dashboard overview        │  (Cursor's file │
│  │  • Agents  │  - Initiative detail         │   explorer +    │
│B │  • Connec- │  - Pipeline kanban           │   outline panel │
│A │    tions   │  - Content workspace         │   equivalent)   │
│R │            │  - Financial dashboard       │                 │
│  │            │  - Agent config/output       │                 │
│  │            │                              │                 │
├──┴────────────┴──────────────────────────────┴─────────────────┤
│  AGENT BAR: [▶ Lead Sourcer: 12 found] [▶ Content: Draft      │
│  ready] [● Monitor: 2 alerts] [+ New Agent Run]               │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Activity Bar (Left Edge — 48px)

Cursor has a vertical activity bar on the far left for switching sidebar views. We do the same:

| Icon | View | What it shows in the primary sidebar |
|---|---|---|
| 💬 Chat | Chat threads grouped by date, "New Chat" button |
| 🏢 Business | Business aspects, plan sections, business DNA editor |
| 🚀 Initiatives | Active projects with milestones and progress |
| 🤖 Agents | Agent catalog, running agents, scheduled agents |
| 🔌 Connections | Connected accounts (Gmail, Stripe, etc.), add new |
| 📊 Metrics | KPI overview, trends, alerts |
| ⚙️ Settings | Business DNA, preferences, team (future) |

Clicking an activity bar icon swaps what the primary sidebar shows — exactly like clicking Explorer vs. Git vs. Extensions in Cursor.

**Implementation:** Use a state variable for `activeSidebarView`. Each view is a component that renders inside the sidebar area. The activity bar is a fixed 48px column of icon buttons.

### 3.3 Primary Sidebar (Resizable — Default 280px)

Replaces the current fixed `w-64` sidebar. Key changes:

- **Resizable** using `react-resizable-panels` with drag handle and min/max constraints (200px–400px)
- **Collapsible** with Cmd+B (like Cursor) — collapses to just the activity bar
- **View-dependent content** — what shows depends on which activity bar icon is selected
- **Search at top** — every sidebar view has a filter/search input

### 3.4 Main Workspace (Center — Flex)

This is the big change. Instead of one page at a time, the workspace supports:

**Split views:** Show chat + business plan side by side. Or agent output + the data it's referencing. Implemented with `react-resizable-panels` horizontal splits.

**Tabs:** Like editor tabs in Cursor. Each "open thing" gets a tab:
- Chat sessions
- Business plan aspects
- Initiative details
- Agent runs/output
- Financial views

Tabs persist across navigation. Clicking a sidebar item opens it as a new tab (or focuses existing). Middle-click to open in background.

**Implementation:**
- Tab state managed in a context/store (array of `{ id, type, label, data }`)
- Each tab type renders a different component
- `react-resizable-panels` for split views within the workspace
- `PanelGroup` with `direction="horizontal"` for side-by-side splits
- Layout persistence via `autoSaveId` to localStorage

### 3.5 Context Panel (Right — Resizable, Collapsible)

Like Cursor's outline/context panel on the right. Shows contextual information based on what's active in the main workspace:

**When viewing chat:**
- Business DNA summary (name, stage, key metrics)
- Recent agent activity
- Relevant business aspects (auto-detected from conversation)
- Quick action buttons ("Update plan", "Create initiative", "Run agent")

**When viewing a business plan aspect:**
- Related initiatives
- Relevant metrics
- Recent changes/updates
- Connected agents

**When viewing an initiative:**
- Assigned agents and their status
- Related plan sections
- Timeline/milestones
- Decision log entries

**Implementation:** Collapsible with Cmd+Shift+B. Default 300px. Min 240px, max 450px. Content driven by a `useContextPanel(activeTab)` hook that returns relevant data.

### 3.6 Agent Bar (Bottom — 36px, Expandable)

Like Cursor's terminal panel / status bar hybrid:

- **Collapsed (default):** Single 36px bar showing running agent badges with status indicators
  - Green dot = running, blue dot = completed, orange dot = needs approval, red dot = error
  - Click badge to expand that agent's output
  - Right side: "+ Run Agent" button

- **Expanded:** Grows upward to show a panel (like Cursor's terminal) with:
  - Tabbed agent outputs (like terminal tabs)
  - Real-time streaming output
  - Approve/reject buttons for pending actions
  - Re-run button
  - Full execution log

**Implementation:** `react-resizable-panels` with `direction="vertical"` splitting the workspace and agent bar. Agent bar has a min collapsed height of 36px, expandable to 50% of viewport.

### 3.7 Command Palette (Cmd+K)

The single most impactful power-user feature. A floating search/command modal:

**Actions available:**
- "Go to [aspect/initiative/agent]" — navigation
- "Run [agent name]" — trigger agent
- "Update [aspect] plan" — open aspect in editor mode
- "Draft [content type] about [topic]" — trigger content agent
- "Check [metric]" — show metric in context panel
- "Connect [service]" — open OAuth flow
- "Search business for [query]" — semantic search across business state
- "New initiative: [name]" — create initiative
- "Ask copilot: [question]" — send to chat

**Implementation:**
- Floating modal with search input, rendered at app root level
- Fuzzy search across all registered commands
- Commands registered by each module (agents register their commands, aspects register theirs, etc.)
- Recent commands shown on empty state
- Keyboard navigation (arrow keys + enter)

### 3.8 Inline Agent Actions

When hovering over any piece of business data (a plan section, a metric, a todo item), show a small floating toolbar:

- ✨ "Improve this" — sends to copilot with context
- 📝 "Expand" — agent elaborates
- ❓ "Challenge" — agent pressure-tests the assumption
- ✅ "Create task" — converts to todo/initiative
- 🤖 "Assign agent" — attach an agent to monitor/execute

Like Cursor's inline edit (Cmd+K on selected code), but for business content.

### 3.9 Specific Component Changes

**From current → target:**

| Current | Target |
|---|---|
| `AppShell` with fixed sidebar + outlet | `WorkspaceShell` with activity bar + resizable sidebar + tabbed workspace + context panel + agent bar |
| `ChatPage` as a full page | `ChatPanel` as a workspace tab (can be split with other views) |
| `DashboardPage` with static cards | `BusinessOverview` panel with live metrics, agent status, initiative progress |
| `BusinessDashboardPage` as separate page | Business views integrated into sidebar + workspace tabs (aspects, todos, updates are all separate openable tabs) |
| `AgentPage` with static cards | `AgentSidebar` view in sidebar + `AgentRunPanel` as workspace tabs |
| No command palette | `CommandPalette` component at app root |
| No context panel | `ContextPanel` with dynamic content |
| No agent bar | `AgentBar` with live status + expandable output |

### 3.10 Theme Adjustments

The current zinc dark theme is a solid foundation. Adjustments to feel more IDE-like:

- **Borders:** Change `--color-border` from `transparent` to a subtle `#27272a` (zinc-800). IDE interfaces need visible panel boundaries.
- **Panel backgrounds:** Differentiate panels slightly. Sidebar: `#0a0a0c`, workspace: `#09090b`, context panel: `#0a0a0c`. Subtle but important for spatial awareness.
- **Active tab indicator:** Bright top border (2px) on active tab, like Cursor's active editor tab.
- **Activity bar:** Slightly lighter background than sidebar (`#111113`), active icon gets a left border accent.
- **Agent bar:** Darker background (`#07070a`) with a top border, like a terminal panel.
- **Resize handles:** 4px wide, transparent by default, `bg-zinc-700` on hover, `bg-zinc-500` while dragging.
- **Focus indicators:** Bright ring on focused panel (which panel is "active") — like Cursor highlights which editor pane has focus.

### 3.11 Key Dependencies to Add

```
react-resizable-panels  — resizable panel layout (Brian Vaughn, React team)
cmdk                    — command palette component (Paco Coursey)
```

Both are lightweight, well-maintained, and battle-tested.

---

## Part 4: The Execution Layer (External Connections)

### Architecture: Layered Execution

```
┌─────────────────────────────────────────────────┐
│              LANGGRAPH AGENT                     │
│         (existing architecture)                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  LAYER 1: Internal Tools (we own)                │
│  searchNotes, loadAspect, identifyGaps,          │
│  askFounderQuestions, convertToBusiness,          │
│  updateBusinessState, queryMetrics,              │
│  manageInitiatives, logDecision                  │
│                                                  │
│  LAYER 2: Composio (external SaaS execution)     │
│  Gmail, Google Sheets, Stripe, LinkedIn,         │
│  Calendar, Slack, Twitter/X, Notion,             │
│  HubSpot, Airtable (800+ tools)                 │
│  Per-user OAuth managed by Composio              │
│  Dynamic tool discovery at runtime               │
│                                                  │
│  LAYER 3: Custom MCP Servers (deep integrations) │
│  Business State MCP (expose business graph       │
│  via MCP for external AI tools to plug in)       │
│  Web Research MCP (Puppeteer for competitor      │
│  analysis, market research)                      │
│  File Generation MCP (PDFs, proposals, decks)    │
│                                                  │
│  LAYER 4: n8n Workflows (scheduled automations)  │
│  Weekly competitor scan, daily lead digest,       │
│  content publish pipeline, monthly financial     │
│  rollup — triggered via webhook from agent       │
│                                                  │
├─────────────────────────────────────────────────┤
│  SAFETY: Human-in-the-Loop                       │
│  Read ops → auto-execute                         │
│  Low-risk writes → execute + log                 │
│  High-risk writes → queue for approval           │
│  Financial actions → always require approval     │
└─────────────────────────────────────────────────┘
```

### Why Composio as the Primary Integration Layer

| Factor | Why |
|---|---|
| We already use LangGraph | Composio has first-class LangGraph integration — tools just bind directly |
| Multi-tenant | Each user connects THEIR Gmail, Stripe, etc. Composio manages per-user OAuth |
| Dynamic discovery | 5 "meta tools" let agents discover available tools at runtime (like Cursor discovers your codebase) |
| Agent-native | LLM decides which tool to call dynamically — matches our LangGraph architecture |
| No auth plumbing | OAuth flows, token refresh, credential storage all handled |
| 800+ tools | Gmail, Sheets, Stripe, Slack, LinkedIn, HubSpot, Notion, Airtable, etc. |

### Integration into Current Architecture

Current tool registration (`apps/api/src/graph/v1/tools/index.ts`):

```typescript
// Current: static list of internal tools
export const allTools: DynamicStructuredTool[] = [
  searchNotesTool, loadAspectTool, ...
];
```

After Composio integration:

```typescript
import { Composio } from "@composio/core";

const composio = new Composio();

export async function getToolsForUser(userId: string) {
  const session = await composio.create(userId);
  const composioTools = await session.tools();

  return [
    ...allTools,           // existing 11 internal tools
    ...composioTools,      // Composio's 5 meta-tools for external execution
  ];
}
```

The agent's tool list becomes dynamic and per-user. The 5 Composio meta-tools are:

1. `COMPOSIO_SEARCH_TOOLS` — discover relevant tools across 800+ apps
2. `COMPOSIO_MANAGE_CONNECTIONS` — handle OAuth in-chat ("connect your Gmail to proceed")
3. `COMPOSIO_MULTI_EXECUTE_TOOL` — run up to 20 tools in parallel
4. `COMPOSIO_REMOTE_WORKBENCH` — run Python code in sandbox
5. `COMPOSIO_REMOTE_BASH_TOOL` — execute bash commands

### MCP Servers (Layer 3)

For deep integrations where Composio is too generic:

- **Business State MCP Server** — Exposes the Business State Graph via MCP protocol. Useful if users want other AI tools (Claude Desktop, etc.) to access their Vibe Founder business data.
- **Web Research MCP** — Puppeteer/Playwright-based deep research. Competitor website analysis, pricing page scraping, market research that goes beyond API calls.
- **File Generation MCP** — Generate PDFs (proposals, invoices), slide decks, spreadsheet templates.

### n8n Workflows (Layer 4, Future)

Self-hosted n8n for complex scheduled automations:
- Weekly: Competitor monitoring sweep → update competitive landscape
- Daily: New lead digest → score → add top picks to pipeline
- Monthly: Financial data rollup → generate report → flag anomalies
- On-trigger: Content drafted → brand voice review → schedule publish

Agents trigger these via webhook. n8n handles the multi-step orchestration.

### Human-in-the-Loop Approval System

Critical for trust. Classification:

| Risk Level | Examples | Behavior |
|---|---|---|
| **Read** | Search contacts, check calendar, look up data | Auto-execute, log result |
| **Write-Low** | Update business plan, add todo, create draft | Execute + show in activity feed |
| **Write-High** | Send email, post to social, create invoice | Queue for approval in Agent Bar |
| **Financial** | Process payment, change pricing, transfer funds | Always require explicit approval + confirmation |

UI for approvals: The Agent Bar shows pending actions as orange badges. Expanding shows the full action preview with [Approve] [Edit] [Reject] buttons.

### Connections Page UI

New sidebar view under the 🔌 Connections activity bar icon:

- Grid of available integrations (Gmail, Stripe, Sheets, etc.) with connect/disconnect status
- "Connect" button opens Composio's hosted OAuth page (Connect Links)
- Connected accounts show status, last used, and a disconnect option
- Agent-initiated connections: if an agent needs Gmail and it's not connected, it can prompt the user in-chat via `COMPOSIO_MANAGE_CONNECTIONS`

---

## Part 5: Initiative System

In Cursor, you work on features via branches. In Vibe Founder, you work on Initiatives.

### What an Initiative Is

A time-bound project with a clear goal:
- "Launch email campaign for Q2"
- "Validate new pricing model"
- "Hire first contractor"
- "Build landing page for new offer"

### Initiative Structure

```
Initiative
├── name, description, goal
├── success_criteria (measurable)
├── status (planning | active | paused | completed | cancelled)
├── timeline (start_date, target_date)
├── milestones[] (name, target_date, status)
├── assigned_agents[] (agent_id, config, schedule)
├── related_aspects[] (which business domains it touches)
├── decision_log[] (what was decided, why, outcome)
├── tasks[] (actionable items with assignee: human | agent)
└── metrics[] (KPIs being tracked for this initiative)
```

### How Initiatives Work

- The copilot can create initiatives from conversation: "Let's improve our conversion rate" → creates initiative, suggests agents, outlines milestones.
- Each initiative is a workspace tab showing its full state.
- Agents can be assigned to initiatives and report progress back.
- The context panel shows initiative info when relevant.

---

## Part 6: Business DNA (`.cursorrules` Equivalent)

A dedicated editor for the rules and preferences that shape ALL AI behavior across the platform:

```yaml
voice:
  tone: "Direct, confident, slightly irreverent"
  avoid: ["corporate jargon", "buzzwords", "passive voice"]
  examples:
    - "We build tools that make complexity disappear."
    - "If it takes more than 3 clicks, we failed."

principles:
  - "Speed over perfection — ship weekly"
  - "Customer conversations > market research"
  - "Never compete on price"

boundaries:
  max_email_sends_per_day: 50
  require_approval_for: ["invoices > $1000", "public posts", "cold outreach"]
  never_contact: ["competitor employees", "existing customers for cold outreach"]

defaults:
  email_signature: "..."
  reply_tone: "friendly-professional"
  content_style: "actionable, data-backed, concise"
```

This lives in the Business State Graph and is injected into every agent's context. Editable via a dedicated workspace tab with a structured form editor (not raw YAML — the YAML above is just the data model).

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
> Make the business a living, queryable entity

- [ ] Expand Prisma schema: Initiative, DecisionLog, Metric, Connection models
- [ ] Extend vector store to index all business data (not just knowledge base)
- [ ] Build `@mention` context injection in chat
- [ ] Add `cmdk` command palette (Cmd+K)

### Phase 2: Workspace Shell (Week 3-4)
> Transform the layout from chat app to IDE

- [ ] Install `react-resizable-panels`
- [ ] Build `WorkspaceShell` replacing `AppShell`: activity bar + resizable sidebar + main workspace + context panel + agent bar
- [ ] Implement tab system for main workspace
- [ ] Build `ContextPanel` with dynamic content based on active tab
- [ ] Build `AgentBar` with collapsed/expanded states
- [ ] Update theme: visible borders, differentiated panel backgrounds, active indicators
- [ ] Keyboard shortcuts: Cmd+B (toggle sidebar), Cmd+Shift+B (toggle context panel), Cmd+K (command palette)

### Phase 3: Agents Come Alive (Week 5-6)
> Ship 3 real, useful agents

- [ ] Build agent execution framework: input validation, business context injection, tool execution, output routing, logging
- [ ] Implement Competitor Researcher agent
- [ ] Implement Content Drafter agent
- [ ] Implement Lead Researcher agent
- [ ] Agent output streams to Agent Bar in real-time
- [ ] Agent results write back to Business State Graph

### Phase 4: External Connections (Week 7-8)
> Agents that DO things, not just suggest

- [ ] Integrate Composio SDK (`@composio/core`)
- [ ] Build Connections sidebar view with OAuth flow
- [ ] Extend agent tool list to include Composio meta-tools (per-user)
- [ ] Build human-in-the-loop approval queue in Agent Bar
- [ ] Implement risk classification for tool calls (read / write-low / write-high / financial)
- [ ] Test end-to-end: agent sends email via Gmail, creates invoice via Stripe

### Phase 5: Initiatives & Business DNA (Week 9-10)
> Structured execution and AI personality

- [ ] Build Initiative CRUD + workspace tab view
- [ ] Initiative creation from copilot conversation
- [ ] Agent assignment to initiatives
- [ ] Build Business DNA editor (structured form, not raw text)
- [ ] Inject Business DNA into all agent system prompts
- [ ] Decision log with automatic capture from agent actions

### Phase 6: Polish & Scheduled Agents (Week 11-12)
> The business runs itself (with oversight)

- [ ] Scheduled agent runs (cron-like)
- [ ] Agent composition (chain agents together)
- [ ] Metrics tracking and trend visualization
- [ ] Templates/playbooks ("Launch a SaaS", "Scale a Service Business")
- [ ] n8n integration for complex multi-step workflows
- [ ] Layout persistence (save panel sizes, open tabs, sidebar state)

---

## Competitive Moat

| Competitor Weakness | Vibe Founder Advantage |
|---|---|
| **Shallow context** — agents work in isolation | **Deep context** — Business State Graph means every agent knows everything |
| **Tool sprawl** — "Connect 80+ integrations!" with no coherence | **Unified workspace** — one environment where everything connects to the business model |
| **No-code builder paradigm** — drag boxes, connect arrows | **Conversational + visual hybrid** — talk naturally AND see structured views |
| **Generic AI** — same agent for every business | **Business DNA** — AI behavior shaped by YOUR principles, voice, and strategy |
| **Output only** — agents give text to copy-paste | **State mutation** — agents update the living business plan, pipeline, and metrics |
| **No memory** — each interaction starts fresh | **Full history** — decision log, metric trends, conversation continuity |
| **Chat-first UI** — glorified ChatGPT wrapper | **IDE-first UI** — workspace with panels, tabs, agents, and context |

**One-line pitch:** Cursor doesn't just write code — it understands your entire project and acts intelligently within it. Vibe Founder does the same for your entire business.

---

## Part 7: System Handoffs & Shared Type Contracts

Every boundary between systems needs a typed contract in `packages/shared`. No `any`, no untyped JSON blobs crossing boundaries. If two systems talk, there's a type in shared that both import.

### 7.1 Handoff Map

```
┌─────────────┐     HTTP/REST      ┌─────────────┐
│             │◄──── JSON ────────►│             │
│   Frontend  │     (typed)        │   Express   │
│   (React)   │                    │   API       │
│             │◄──── SSE ─────────│             │
│             │     (typed events) │             │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ imports                          │ imports
       ▼                                  ▼
┌─────────────────────────────────────────────────┐
│              packages/shared                     │
│   (all type contracts live here)                │
└─────────────────────────────────────────────────┘
       ▲                                  ▲
       │                                  │
┌──────┴──────┐                    ┌──────┴──────┐
│  Composio   │                    │  LangGraph  │
│  SDK        │◄── tool results──►│  Agent      │
│  (per-user  │    (typed)        │  (tools +   │
│   sessions) │                    │   state)    │
└─────────────┘                    └──────┬──────┘
                                          │
                                   ┌──────┴──────┐
                                   │   Prisma    │
                                   │   (DB)      │
                                   └─────────────┘
```

### 7.2 Handoff 1: Frontend ↔ API (REST)

Every `fetch()` call from the frontend hits an Express route. Both sides must agree on request/response shapes.

**What exists today (untyped):**
- Frontend uses raw `fetch()` with inline types or `any`
- API routes cast `req.body as SomeInterface` with local interfaces
- No shared request/response types — each side defines its own

**What we need:** Every API endpoint gets a request type and a response type in shared.

```
packages/shared/src/types/api.ts
```

```typescript
// ── Auth ──────────────────────────────────────────────────

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: UserEntity;
}

interface UserEntity {
  id: string;
  email: string;
  name: string;
  stage: UserStage;
}

type UserStage =
  | "ONBOARDING"
  | "PRODUCT_DEFINITION"
  | "BUSINESS_MODEL"
  | "LAUNCH_PREP"
  | "LAUNCHED"
  | "SCALING";

// ── Sessions ──────────────────────────────────────────────

interface CreateSessionResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface RenameSessionRequest {
  title: string;
}

interface BatchDeleteSessionsRequest {
  sessionIds: string[];
}

// ── Copilot ───────────────────────────────────────────────

interface CopilotRequest {
  message: string;
  threadId: string;
  model?: string;
}

// (Response is SSE — see Handoff 2)

interface ThreadStateResponse {
  messages: { role: string; content: string }[];
}

// ── Businesses ────────────────────────────────────────────

interface ExtractBusinessRequest {
  sessionId: string;
}

interface ExtractBusinessResponse {
  business: BusinessEntity;
}

interface UpdateBusinessRequest {
  update: string;
}

interface UpdateBusinessResponse {
  patch: BusinessUpdatePatch;
  business: BusinessEntity;
}

interface ToggleTodoRequest {
  status: "pending" | "done";
}

// ── Agents ────────────────────────────────────────────────

interface AgentListResponse {
  agents: AgentDefinition[];
}

// ── Aspects ───────────────────────────────────────────────

interface AspectListResponse {
  aspects: { slug: AspectSlug; title: string; rawMarkdown: string }[];
}

// ── Logs ──────────────────────────────────────────────────

interface LogEntry {
  id: string;
  level: string;
  category: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface LogListResponse {
  logs: LogEntry[];
}

// ── NEW: Initiatives ──────────────────────────────────────

interface CreateInitiativeRequest {
  businessId: string;
  name: string;
  description: string;
  goal: string;
  successCriteria: string[];
  targetDate?: string;
  relatedAspects?: AspectSlug[];
}

interface InitiativeEntity {
  id: string;
  businessId: string;
  name: string;
  description: string;
  goal: string;
  successCriteria: string[];
  status: InitiativeStatus;
  startDate: string;
  targetDate: string | null;
  milestones: MilestoneEntity[];
  tasks: InitiativeTaskEntity[];
  assignedAgents: AgentAssignmentEntity[];
  relatedAspects: AspectSlug[];
  createdAt: string;
  updatedAt: string;
}

type InitiativeStatus = "planning" | "active" | "paused" | "completed" | "cancelled";

interface MilestoneEntity {
  id: string;
  name: string;
  targetDate: string;
  status: "pending" | "reached" | "missed";
}

interface InitiativeTaskEntity {
  id: string;
  title: string;
  assignee: "human" | "agent";
  agentId?: string;
  status: "pending" | "in_progress" | "done";
}

interface AgentAssignmentEntity {
  agentId: string;
  config: Record<string, unknown>;
  schedule?: string;
}

// ── NEW: Connections ──────────────────────────────────────

interface ConnectionEntity {
  id: string;
  userId: string;
  provider: string;
  accountLabel: string;
  status: "active" | "expired" | "revoked";
  composioConnectionId: string;
  lastUsedAt: string | null;
  connectedAt: string;
}

interface ConnectServiceRequest {
  provider: string;
  redirectUrl: string;
}

interface ConnectServiceResponse {
  authUrl: string;
}

// ── NEW: Decision Log ─────────────────────────────────────

interface DecisionLogEntry {
  id: string;
  businessId: string;
  initiativeId: string | null;
  decision: string;
  reasoning: string;
  madeBy: "human" | "agent";
  agentId?: string;
  outcome?: string;
  createdAt: string;
}

// ── NEW: Metrics ──────────────────────────────────────────

interface MetricEntity {
  id: string;
  businessId: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  source: "manual" | "agent" | "integration";
  recordedAt: string;
}

// ── NEW: Business DNA ─────────────────────────────────────

interface BusinessDNA {
  voice: {
    tone: string;
    avoid: string[];
    examples: string[];
  };
  principles: string[];
  boundaries: {
    maxEmailSendsPerDay: number;
    requireApprovalFor: string[];
    neverContact: string[];
  };
  defaults: Record<string, string>;
}
```

### 7.3 Handoff 2: API → Frontend (SSE Stream)

The copilot endpoint streams Server-Sent Events. This is the most complex contract — today the event shapes are defined inline on both sides with no shared type.

**What exists today:**
- API writes `sendEvent({ type: "token", content: "..." })` — ad-hoc shapes
- Frontend parses as `SSEEvent` — a local interface in `useCopilot.ts` with optional fields for everything

**What we need:** A discriminated union in shared so every event type has an exact shape.

```
packages/shared/src/types/sse.ts
```

```typescript
interface SSEAgentStart {
  type: "agent_start";
  threadId: string;
  message: string;
}

interface SSEToken {
  type: "token";
  content: string;
}

interface SSEThinking {
  type: "thinking";
  content: string;
}

interface SSEToolCall {
  type: "tool_call";
  tool: string;
  toolCallId: string;
  args: Record<string, unknown>;
}

interface SSEToolStart {
  type: "tool_start";
  tool: string;
  runId: string;
}

interface SSEToolEnd {
  type: "tool_end";
  tool: string;
  runId: string;
}

interface SSEQuestions {
  type: "questions";
  questions: FounderQuestion[];
}

interface SSEBusinessPreview {
  type: "business_preview";
  business: BusinessPreview;
}

interface SSEDone {
  type: "done";
  threadId: string;
}

interface SSEError {
  type: "error";
  message: string;
}

// NEW: Agent execution events (for Agent Bar)

interface SSEAgentRunStart {
  type: "agent_run_start";
  runId: string;
  agentId: string;
  agentName: string;
}

interface SSEAgentRunProgress {
  type: "agent_run_progress";
  runId: string;
  message: string;
  progress?: number;
}

interface SSEAgentRunResult {
  type: "agent_run_result";
  runId: string;
  status: "completed" | "failed" | "needs_approval";
  result?: unknown;
  error?: string;
}

interface SSEApprovalRequired {
  type: "approval_required";
  approvalId: string;
  runId: string;
  action: string;
  description: string;
  riskLevel: "write_low" | "write_high" | "financial";
  preview: Record<string, unknown>;
}

type CopilotSSEEvent =
  | SSEAgentStart
  | SSEToken
  | SSEThinking
  | SSEToolCall
  | SSEToolStart
  | SSEToolEnd
  | SSEQuestions
  | SSEBusinessPreview
  | SSEDone
  | SSEError
  | SSEAgentRunStart
  | SSEAgentRunProgress
  | SSEAgentRunResult
  | SSEApprovalRequired;
```

Both sides import `CopilotSSEEvent`:
- **API** (`copilot.ts`): `sendEvent(event: CopilotSSEEvent)` — type-checked at write time
- **Frontend** (`useCopilot.ts`): `const event: CopilotSSEEvent = JSON.parse(jsonStr)` — discriminated union enables exhaustive `switch`

### 7.4 Handoff 3: LangGraph Agent ↔ Internal Tools

Each tool's input and output should be typed, not just Zod-validated at runtime.

**What exists today:**
- Tool inputs validated by Zod schemas (good)
- Tool outputs are raw `JSON.stringify()` strings — consumer (the LLM) doesn't care, but logging, testing, and the tool node do

**What we need:** Typed tool results so the tool node, execution logger, and any future tool-result UI can rely on structure.

```
packages/shared/src/types/tool-results.ts
```

```typescript
// Every tool result is either success or error
type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Knowledge tools ───────────────────────────────────────

interface SearchNotesResult {
  results: {
    content: string;
    aspect: string;
    title: string;
    score: number;
  }[];
}

interface LoadAspectResult {
  slug: AspectSlug;
  title: string;
  content: string;
}

interface ListAspectsResult {
  aspects: { slug: AspectSlug; title: string }[];
}

// ── Analysis tools ────────────────────────────────────────

interface IdentifyGapsResult {
  gaps: {
    aspect: AspectSlug;
    gap: string;
    severity: "high" | "medium" | "low";
    suggestion: string;
  }[];
}

interface PrioritizeActionsResult {
  actions: {
    title: string;
    aspect: AspectSlug;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
    rationale: string;
  }[];
}

// ── Agent tools ───────────────────────────────────────────

interface ListAgentsResult {
  agents: {
    id: string;
    name: string;
    description: string;
    type: AgentType;
    aspect: string;
    available: boolean;
  }[];
}

interface RunAgentResult {
  runId: string;
  status: AgentStatus;
  message: string;
}

// ── Interactive tools ─────────────────────────────────────

interface AskFounderQuestionsInput {
  questions: FounderQuestion[];
}

interface ConvertToBusinessInput {
  name: string;
  description: string;
  industry: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
}

// ── NEW: Business state mutation tools ────────────────────

interface UpdateBusinessStateInput {
  businessId: string;
  patch: BusinessUpdatePatch;
}

interface QueryMetricsInput {
  businessId: string;
  keys?: string[];
  since?: string;
}

interface QueryMetricsResult {
  metrics: MetricEntity[];
}

interface LogDecisionInput {
  businessId: string;
  initiativeId?: string;
  decision: string;
  reasoning: string;
}

interface ManageInitiativeInput {
  action: "create" | "update" | "addMilestone" | "assignAgent";
  businessId: string;
  initiativeId?: string;
  data: Record<string, unknown>;
}
```

### 7.5 Handoff 4: Agent ↔ Composio (External Tools)

The boundary between our LangGraph agent and Composio's tool system.

**Contract needed:**

```
packages/shared/src/types/composio.ts
```

```typescript
// Composio session tied to our user
interface ComposioSession {
  userId: string;
  composioEntityId: string;
  activeConnections: string[];
}

// When agent requests a tool via Composio, we log it
interface ComposioToolExecution {
  userId: string;
  businessId: string;
  tool: string;
  provider: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: "success" | "failed" | "pending_approval";
  riskLevel: ToolRiskLevel;
  timestamp: string;
}

type ToolRiskLevel = "read" | "write_low" | "write_high" | "financial";

// Risk classification for any tool call (internal or external)
interface ToolRiskClassification {
  tool: string;
  provider: string;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  reason: string;
}

// Approval queue item (stored in DB, shown in Agent Bar)
interface PendingApproval {
  id: string;
  userId: string;
  businessId: string;
  agentRunId: string;
  tool: string;
  provider: string;
  action: string;
  description: string;
  riskLevel: ToolRiskLevel;
  preview: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "expired";
  createdAt: string;
  resolvedAt: string | null;
}
```

### 7.6 Handoff 5: Agent ↔ Business State Graph (Read/Write)

When agents read from or write to the business state, the shape of what they get and what they can mutate must be typed.

**Contract:**

```
packages/shared/src/types/business-state.ts
```

```typescript
// Full business state snapshot (what an agent sees)
interface BusinessStateSnapshot {
  business: BusinessEntity;
  plans: BusinessPlanEntity[];
  todos: TodoEntity[];
  initiatives: InitiativeEntity[];
  connections: ConnectionEntity[];
  metrics: MetricEntity[];
  decisionLog: DecisionLogEntry[];
  dna: BusinessDNA | null;
}

// What the @ mention system resolves to
type MentionContext =
  | { type: "plan"; data: BusinessPlanEntity }
  | { type: "competitors"; data: CompetitorEntry[] }
  | { type: "pipeline"; data: PipelineEntry[] }
  | { type: "finances"; data: MetricEntity[] }
  | { type: "initiative"; data: InitiativeEntity }
  | { type: "voice"; data: BusinessDNA["voice"] }
  | { type: "customer"; data: CustomerEntry }
  | { type: "full_plan"; data: BusinessPlanEntity[] };

interface CompetitorEntry {
  id: string;
  name: string;
  website: string | null;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  lastUpdated: string;
  source: "agent" | "manual";
}

interface PipelineEntry {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  stage: "lead" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  value: number | null;
  source: string;
  lastActivity: string;
  notes: string;
}

interface CustomerEntry {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: "active" | "churned" | "prospect";
  history: { date: string; event: string }[];
}
```

### 7.7 Handoff 6: Frontend ↔ Workspace State (Client-Side)

The tab system, panel state, and command palette need their own types — these are client-only but should still be in a shared location for consistency.

```
packages/shared/src/types/workspace.ts
```

```typescript
type WorkspaceTabType =
  | "chat"
  | "business_overview"
  | "plan_aspect"
  | "initiative"
  | "agent_run"
  | "agent_config"
  | "connections"
  | "metrics"
  | "business_dna"
  | "pipeline"
  | "content";

interface WorkspaceTab {
  id: string;
  type: WorkspaceTabType;
  label: string;
  icon: string;
  data: Record<string, unknown>;
  closeable: boolean;
  dirty: boolean;
}

interface WorkspaceLayout {
  activeSidebarView: SidebarView;
  sidebarCollapsed: boolean;
  contextPanelCollapsed: boolean;
  agentBarExpanded: boolean;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  splitDirection: "horizontal" | "vertical" | null;
  splitTabIds: [string, string] | null;
}

type SidebarView =
  | "chat"
  | "business"
  | "initiatives"
  | "agents"
  | "connections"
  | "metrics"
  | "settings";

// Command palette
interface CommandDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

// Context panel
type ContextPanelContent =
  | { type: "chat_context"; businessSummary: BusinessEntity | null; recentAgentRuns: AgentRun[]; suggestedActions: string[] }
  | { type: "plan_context"; aspect: BusinessPlanEntity; relatedInitiatives: InitiativeEntity[]; relatedMetrics: MetricEntity[] }
  | { type: "initiative_context"; initiative: InitiativeEntity; assignedAgents: AgentDefinition[]; decisions: DecisionLogEntry[] }
  | { type: "agent_context"; agent: AgentDefinition; recentRuns: AgentRun[]; relatedBusiness: BusinessEntity | null }
  | { type: "empty" };
```

### 7.8 Handoff 7: Agent Bar ↔ Agent Execution Runtime

The agent bar UI subscribes to real-time agent execution state. This is a second SSE channel (or WebSocket in the future) separate from the copilot chat stream.

```
packages/shared/src/types/agent-runtime.ts
```

```typescript
// Agent run lifecycle (persisted in DB + streamed to frontend)
interface AgentRunEntity {
  id: string;
  userId: string;
  businessId: string;
  agentId: string;
  initiativeId: string | null;
  status: "queued" | "running" | "completed" | "failed" | "waiting_approval" | "cancelled";
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  logs: AgentRunLogEntry[];
  pendingApprovals: PendingApproval[];
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface AgentRunLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  tool?: string;
  data?: Record<string, unknown>;
}

// Request to start an agent run
interface StartAgentRunRequest {
  agentId: string;
  businessId: string;
  initiativeId?: string;
  parameters?: Record<string, unknown>;
}

// Request to resolve a pending approval
interface ResolveApprovalRequest {
  approvalId: string;
  decision: "approved" | "rejected";
  editedPayload?: Record<string, unknown>;
}

// SSE events for agent execution (separate from copilot stream)
type AgentBarSSEEvent =
  | { type: "run_started"; run: AgentRunEntity }
  | { type: "run_progress"; runId: string; message: string; progress?: number }
  | { type: "run_log"; runId: string; entry: AgentRunLogEntry }
  | { type: "approval_needed"; runId: string; approval: PendingApproval }
  | { type: "run_completed"; runId: string; output: Record<string, unknown> }
  | { type: "run_failed"; runId: string; error: string }
  | { type: "run_cancelled"; runId: string };
```

### 7.9 Summary: All Handoffs at a Glance

| # | From | To | Transport | Contract File | Key Types |
|---|---|---|---|---|---|
| 1 | Frontend | API | REST JSON | `api.ts` | Request/Response pairs for every endpoint |
| 2 | API | Frontend | SSE stream | `sse.ts` | `CopilotSSEEvent` discriminated union |
| 3 | Agent | Internal Tools | Function call | `tool-results.ts` | `ToolResult<T>` for every tool |
| 4 | Agent | Composio | SDK call | `composio.ts` | `ComposioToolExecution`, `PendingApproval`, `ToolRiskLevel` |
| 5 | Agent | Business State | DB read/write | `business-state.ts` | `BusinessStateSnapshot`, `MentionContext` |
| 6 | Frontend | Workspace | Client state | `workspace.ts` | `WorkspaceTab`, `WorkspaceLayout`, `CommandDefinition`, `ContextPanelContent` |
| 7 | Agent Bar | Agent Runtime | SSE + REST | `agent-runtime.ts` | `AgentRunEntity`, `AgentBarSSEEvent`, `StartAgentRunRequest` |

### 7.10 Migration Plan for Existing Untyped Boundaries

**Today's gaps (to fix in Phase 1):**

1. **`useCopilot.ts` SSEEvent** — Replace the local `SSEEvent` interface with imported `CopilotSSEEvent` from shared. Switch from optional fields to discriminated union with exhaustive switch.

2. **`copilot.ts` sendEvent** — Type the `sendEvent` function: `const sendEvent = (data: CopilotSSEEvent) => ...`

3. **API route handlers** — Replace inline `req.body as X` casts with imported request types. Add response type annotations to all handlers.

4. **Frontend fetch calls** — Create a typed API client (thin wrapper around fetch) that enforces request/response types per endpoint:
   ```typescript
   const api = {
     auth: {
       login: (body: LoginRequest): Promise<AuthResponse> => post("/api/auth/login", body),
       register: (body: RegisterRequest): Promise<AuthResponse> => post("/api/auth/register", body),
     },
     sessions: {
       list: (): Promise<SessionListItem[]> => get("/api/sessions"),
       create: (): Promise<CreateSessionResponse> => post("/api/sessions"),
       // ...
     },
     businesses: {
       extract: (body: ExtractBusinessRequest): Promise<ExtractBusinessResponse> => post("/api/businesses/extract", body),
       // ...
     },
   };
   ```

5. **`BusinessPreview` in `useCopilot.ts`** — Already matches `ConvertToBusinessInput` in shape. Unify to one type.

6. **`FounderQuestion` in `useCopilot.ts`** — Move to shared (used by both the tool's Zod schema and the frontend's question widget).

### 7.11 Shared Package File Structure (Target)

```
packages/shared/src/
  index.ts                    # re-exports everything
  types/
    business.ts               # (exists) BusinessEntity, plans, todos, aspects, patches
    chat.ts                   # (exists) ChatMessage, ChatRequest
    agent.ts                  # (exists) AgentDefinition, AgentRun, AGENT_CATALOG
    api.ts                    # (NEW) all REST request/response pairs
    sse.ts                    # (NEW) CopilotSSEEvent discriminated union
    tool-results.ts           # (NEW) typed results for every internal tool
    composio.ts               # (NEW) Composio session, tool execution, risk classification
    business-state.ts         # (NEW) BusinessStateSnapshot, MentionContext, Pipeline, Competitors
    workspace.ts              # (NEW) tabs, layout, commands, context panel
    agent-runtime.ts          # (NEW) AgentRunEntity, AgentBarSSEEvent, approvals
    business-dna.ts           # (NEW) BusinessDNA structure

