/**
 * CLI test for the Copy Logs pipeline.
 * Mirrors the frontend CopyLogsButton flow end-to-end.
 *
 * Usage: npx tsx scripts/test-copy-logs.ts [message]
 */

const API = "http://localhost:3001";
const TEST_EMAIL = "test-copylogs@test.com";
const TEST_PASSWORD = "testpass123";
const TEST_NAME = "CopyLogs Test";

interface DebugLogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
}

interface BackendLogEntry {
  id: string;
  level: string;
  category: string;
  source: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

async function getToken(): Promise<string> {
  let res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (res.ok) return (await res.json()).token;

  res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).token;
}

async function sendCopilotMessage(
  token: string,
  threadId: string,
  message: string
): Promise<{ debugLogs: DebugLogEntry[]; content: string }> {
  const debugLogs: DebugLogEntry[] = [];
  const toolTimers = new Map<string, number>();
  let content = "";

  const pushLog = (level: string, msg: string, data?: Record<string, unknown>) => {
    debugLogs.push({ timestamp: new Date().toISOString(), level, message: msg, data });
  };

  console.log(`\n>>> Sending copilot message (threadId=${threadId})...`);

  const res = await fetch(`${API}/api/copilot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, threadId }),
  });

  if (!res.ok) throw new Error(`Copilot failed: ${res.status} ${await res.text()}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;
      let event: Record<string, unknown>;
      try { event = JSON.parse(jsonStr); } catch { continue; }

      const type = event.type as string;
      switch (type) {
        case "agent_start":
          pushLog("info", "Agent started", { threadId: event.threadId as string });
          console.log("  [SSE] agent_start");
          break;
        case "token":
          content += event.content as string;
          break;
        case "tool_start": {
          const rid = (event.runId as string) || (event.tool as string);
          toolTimers.set(rid, Date.now());
          pushLog("info", `Tool started: ${event.tool}`, { tool: event.tool as string, runId: event.runId as string });
          console.log(`  [SSE] tool_start: ${event.tool}`);
          break;
        }
        case "tool_end": {
          const k = (event.runId as string) || (event.tool as string);
          const st = toolTimers.get(k);
          const dur = st ? Date.now() - st : undefined;
          toolTimers.delete(k);
          pushLog("info", `Tool ended: ${event.tool}`, { tool: event.tool as string, durationMs: dur });
          console.log(`  [SSE] tool_end: ${event.tool} (${dur ?? "?"}ms)`);
          break;
        }
        case "error":
          pushLog("error", (event.message as string) || "Error");
          console.log(`  [SSE] ERROR: ${event.message}`);
          break;
        case "done":
          pushLog("info", "Stream completed");
          console.log("  [SSE] done");
          break;
      }
    }
  }
  return { debugLogs, content };
}

async function fetchBackendLogs(token: string, threadIds: string[]): Promise<BackendLogEntry[]> {
  const all: BackendLogEntry[] = [];
  for (const tid of threadIds) {
    const params = new URLSearchParams({ category: "COPILOT", search: tid, limit: "200" });
    console.log(`>>> Fetching backend logs for "${tid}"...`);
    const res = await fetch(`${API}/api/logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { console.log(`  FAILED: ${res.status}`); continue; }
    const data = await res.json();
    console.log(`  Found ${data.logs?.length ?? 0} logs`);
    if (data.logs) all.push(...data.logs);
  }
  return all;
}

function formatThreadLogs(
  threadId: string,
  messages: { role: string; content: string }[],
  debugLogs: DebugLogEntry[],
  backendLogs: BackendLogEntry[]
): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push("COPILOT THREAD LOG");
  lines.push("=".repeat(60));
  lines.push(`Thread ID: ${threadId}`);
  lines.push(`Messages:  ${messages.length}`);
  lines.push(`Exported:  ${new Date().toISOString()}`);
  lines.push("");

  lines.push("-".repeat(60));
  lines.push("CONVERSATION");
  lines.push("-".repeat(60));
  for (const msg of messages) {
    lines.push(`[${msg.role.toUpperCase()}]`);
    const txt = msg.content.length > 300 ? msg.content.slice(0, 300) + "...[truncated]" : msg.content;
    lines.push(txt);
    lines.push("");
  }

  if (debugLogs.length > 0) {
    lines.push("-".repeat(60));
    lines.push("EXECUTION LOGS (client-side)");
    lines.push("-".repeat(60));
    for (const e of debugLogs) {
      const ts = e.timestamp.split("T")[1]?.replace("Z", "") || e.timestamp;
      const d = e.data ? ` ${JSON.stringify(e.data)}` : "";
      lines.push(`${ts} [${e.level.toUpperCase()}] ${e.message}${d}`);
    }
    lines.push("");
  }

  if (backendLogs.length > 0) {
    const sorted = [...backendLogs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    lines.push("-".repeat(60));
    lines.push("EXECUTION TRACE (backend)");
    lines.push("-".repeat(60));
    for (const e of sorted) {
      const ts = e.createdAt.split("T")[1]?.replace("Z", "") || e.createdAt;
      const m = e.metadata || {};
      const p = [`${ts} [${e.level.toUpperCase()}]`];
      if (m.execType) p.push(`<${m.execType}>`);
      if (m.agent) p.push(`agent=${m.agent}`);
      if (m.toolName) p.push(`tool=${m.toolName}`);
      if (m.durationMs !== undefined) p.push(`${m.durationMs}ms`);
      if (m.error) p.push(`error="${m.error}"`);
      p.push(e.message);
      lines.push(p.join(" "));
    }
    lines.push("");
  }

  lines.push("=".repeat(60));
  return lines.join("\n");
}

async function main() {
  const message = process.argv[2] || "What tools do you have available? Keep your answer brief.";
  const threadId = `test_${Date.now()}`;

  console.log("=== Copy Logs Pipeline Test ===\n");

  console.log(">>> Authenticating...");
  const token = await getToken();
  console.log("  OK\n");

  const { debugLogs, content } = await sendCopilotMessage(token, threadId, message);
  console.log(`\n>>> Response: ${content.length} chars`);
  console.log(`>>> Client debug logs: ${debugLogs.length} entries\n`);

  const backendLogs = await fetchBackendLogs(token, [threadId]);
  console.log(`>>> Backend logs: ${backendLogs.length}\n`);

  const msgs = [{ role: "user", content: message }, { role: "assistant", content }];
  const formatted = formatThreadLogs(threadId, msgs, debugLogs, backendLogs);

  console.log("\n=== FORMATTED OUTPUT ===\n");
  console.log(formatted);

  console.log("\n=== DIAGNOSIS ===");
  console.log(`Client debug logs:  ${debugLogs.length > 0 ? "PASS" : "FAIL"}`);
  console.log(`Backend logs found: ${backendLogs.length > 0 ? "PASS" : "FAIL"}`);
  console.log(`Has trace section:  ${formatted.includes("EXECUTION TRACE") ? "PASS" : "FAIL"}`);
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
