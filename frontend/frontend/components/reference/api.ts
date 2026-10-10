import type {
HealthStatus,
ReportData,
RunEvent,
RunStatus,
RunSummary,
} from "./types";

const BASE =
process.env.NEXT_PUBLIC_API_BASE ||
"https://agentic-ai-business-research.onrender.com";

type SavedReport = {
id: number | string;
user_query: string;
final_report: string;
created_at: string;
agent_results?: Record<string, unknown> | null;
activity_events?: unknown[] | null;
};

type LocalRun = {
runId: string;
objective: string;
createdAt: string;
updatedAt: string;
status: RunStatus["status"];
currentPhase: string;
approved: boolean | null;
revisionCount: number;
cancelled: boolean;
error: string | null;
events: RunEvent[];
report: ReportData | null;
backendReportId: string | null;
controller: AbortController;
};

const runs = new Map<string, LocalRun>();

let nextEventId = 1;

function findLocalRun(runId: string): LocalRun | undefined {
  return runs.get(runId) ??
    Array.from(runs.values()).find(
      (run) => run.backendReportId === runId
    );
}

/* =========================================================
GENERIC JSON HELPER
========================================================= */

async function json<T>(res: Response): Promise<T> {
if (!res.ok) {
let detail = res.statusText;

try {
  const body = await res.json();
  detail = body?.detail ?? detail;
} catch {
  // Ignore non-JSON error responses.
}

throw new Error(detail);

}

return (await res.json()) as T;
}

/* =========================================================
HEALTH
========================================================= */

export async function getHealth(): Promise<HealthStatus> {
const res = await fetch(`${BASE}/health`, {
cache: "no-store",
});

return json<HealthStatus>(res);
}

/* =========================================================
LOCAL RUN HELPERS
========================================================= */

function createRunId(): string {
return `run-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function now(): string {
return new Date().toISOString();
}

/* =========================================================
AGENT NORMALIZATION
========================================================= */

function normalizeAgent(
value: unknown
): RunEvent["agent"] {
const name = String(value ?? "").toLowerCase();

if (name.includes("planner")) return "planner";
if (name.includes("market")) return "market";
if (name.includes("company")) return "company";
if (name.includes("competitor")) return "competitor";
if (name.includes("analysis")) return "analysis";
if (name.includes("writer")) return "writer";
if (name.includes("reviewer")) return "reviewer";
if (name.includes("final")) return "final_report";

return "system";
}

/* =========================================================
EVENT STATUS NORMALIZATION
========================================================= */

function normalizeStatus(
value: unknown
): RunEvent["status"] {
if (value === "running") return "running";
if (value === "completed") return "completed";

if (value === "failed" || value === "error") {
return "failed";
}

if (value === "cancelling") return "cancelling";

return "pending";
}

/* =========================================================
ADD LOCAL EVENT
========================================================= */

function addEvent(
run: LocalRun,
agent: RunEvent["agent"],
status: RunEvent["status"],
message: string,
data: Record<string, unknown> | null = null
): void {
run.events.push({
id: nextEventId++,
run_id: run.runId,
timestamp: now(),
agent,
status,
message,
data,
});

run.updatedAt = now();

if (status === "running") {
run.status = "running";
run.currentPhase = message;
}

if (status === "completed") {
run.currentPhase = message;
}

if (status === "failed") {
run.status = "failed";
run.error = message;
run.currentPhase = "Research failed.";
}
}

/* =========================================================
SSE PARSER
========================================================= */

function parseSseBlock(
block: string
): {
eventName: string;
data: Record<string, unknown>;
} | null {
const lines = block.split(/\r?\n/);

let eventName = "message";
let dataText = "";

for (const line of lines) {
if (line.startsWith("event:")) {
eventName = line.slice(6).trim();
}

if (line.startsWith("data:")) {
  dataText += line.slice(5).trim();
}

}

if (!dataText) return null;

try {
return {
eventName,
data: JSON.parse(dataText) as Record<string, unknown>,
};
} catch {
return null;
}
}

/* =========================================================
REPORT NORMALIZATION
========================================================= */

function normalizeReport(
raw: unknown,
runId: string,
objective: string
): ReportData {
const source =
raw && typeof raw === "object"
? (raw as Record<string, any>)
: {};

const report =
source.report &&
typeof source.report === "object"
? source.report
: source;

return {
run_id: String(
report.run_id ??
report.report_id ??
report.id ??
runId
),

objective:
  report.objective ??
  report.user_query ??
  report.query ??
  objective,

plan:
  report.plan ??
  report.research_plan ??
  report.agent_results?.research_plan ??
  null,

research_findings:
  report.research_findings ??
  report.findings ??
  (report.agent_results && {
    market_research: report.agent_results.market_research,
    company_research: report.agent_results.company_research,
    competitor_research: report.agent_results.competitor_research,
  }) ??
  null,

sources:
  report.sources ??
  null,

analysis:
  report.analysis ??
  report.agent_results?.analysis ??
  null,

review:
  report.review ??
  report.agent_results?.review ??
  null,

final_report:
  report.final_report ??
  report.content ??
  null,

approved:
  typeof report.approved === "boolean"
    ? report.approved
    : true,

revision_count:
  Number(report.revision_count ?? 0),

};
}

/* =========================================================
COMPLETED AGENT RESULTS

Store each real agent result as an event so the output
components can derive content from run.events.
========================================================= */

function storeAgentResults(
run: LocalRun,
rawResults: unknown
): void {
if (
!rawResults ||
typeof rawResults !== "object"
) {
return;
}

const results =
rawResults as Record<string, unknown>;

const agentResultMap: Array<{
key: string;
agent: RunEvent["agent"];
title: string;
}> = [
{
key: "research_plan",
agent: "planner",
title: "Planner execution plan",
},
{
key: "market_research",
agent: "market",
title: "Market research results",
},
{
key: "company_research",
agent: "company",
title: "Company research results",
},
{
key: "competitor_research",
agent: "competitor",
title: "Competitor research results",
},
{
key: "analysis",
agent: "analysis",
title: "Business analysis",
},
{
key: "draft",
agent: "writer",
title: "Writer draft",
},
{
key: "review",
agent: "reviewer",
title: "Reviewer feedback",
},
{
key: "final_report",
agent: "final_report",
title: "Final research report",
},
];

for (const item of agentResultMap) {
const value = results[item.key];

if (
  value === undefined ||
  value === null ||
  value === ""
) {
  continue;
}

addEvent(
  run,
  item.agent,
  "completed",
  `${item.title} received.`,
  {
    [item.key]: value,
    result: value,
  }
);

}
}

/* =========================================================
ACTUAL BACKEND RESEARCH STREAM

Backend endpoint:
POST /research/stream
========================================================= */

async function startResearch(
run: LocalRun
): Promise<void> {
try {
const response = await fetch(
`${BASE}/research/stream`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
Accept: "text/event-stream",
},
body: JSON.stringify({
user_query: run.objective,
}),
signal: run.controller.signal,
}
);

if (!response.ok) {
  let detail = response.statusText;

  try {
    const body = await response.json();
    detail = body?.detail ?? detail;
  } catch {
    // Ignore non-JSON responses.
  }

  throw new Error(detail);
}

if (!response.body) {
  throw new Error(
    "The backend did not provide a streaming response."
  );
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

let buffer = "";

while (true) {
  const { value, done } = await reader.read();

  if (done) break;

  buffer += decoder.decode(value, {
    stream: true,
  });

  const blocks = buffer.split(/\r?\n\r?\n/);
  buffer = blocks.pop() || "";

  for (const block of blocks) {
    const parsed = parseSseBlock(block);

    if (!parsed) continue;

    const { eventName, data } = parsed;

    /* -----------------------------------------
       RESEARCH STARTED
    ----------------------------------------- */

    if (eventName === "research_started") {
      addEvent(
        run,
        "planner",
        "running",
        typeof data.message === "string"
          ? data.message
          : "Understanding the business objective and creating the research plan.",
        data
      );

      continue;
    }

    /* -----------------------------------------
       AGENT PROGRESS
    ----------------------------------------- */

    if (eventName === "agent_progress") {
      const agent = normalizeAgent(data.agent);
      const status = normalizeStatus(data.status);

      const message =
        typeof data.message === "string"
          ? data.message
          : `${String(data.agent ?? "Agent")} is working.`;

      addEvent(
        run,
        agent,
        status,
        message,
        data
      );

      continue;
    }

    /* -----------------------------------------
       RESEARCH COMPLETED
    ----------------------------------------- */

    if (eventName === "research_completed") {
      const reportId =
        data.report_id != null
          ? String(data.report_id)
          : null;

      run.backendReportId = reportId;

      // Store the actual planner and agent outputs first.
      storeAgentResults(
        run,
        data.agent_results
      );

      addEvent(
        run,
        "final_report",
        "completed",
        "Final reviewed business research report is ready.",
        data
      );

      run.status = "completed";
      run.currentPhase = "Final report ready.";
      run.updatedAt = now();

      run.report = normalizeReport(
        {
          report_id: reportId,
          user_query: run.objective,
          plan:
            (
              data.agent_results as
                | Record<string, unknown>
                | undefined
            )?.research_plan,
          research_findings: {
            market_research:
              (
                data.agent_results as
                  | Record<string, unknown>
                  | undefined
              )?.market_research,
            company_research:
              (
                data.agent_results as
                  | Record<string, unknown>
                  | undefined
              )?.company_research,
            competitor_research:
              (
                data.agent_results as
                  | Record<string, unknown>
                  | undefined
              )?.competitor_research,
          },
          analysis:
            (
              data.agent_results as
                | Record<string, unknown>
                | undefined
            )?.analysis,
          review:
            (
              data.agent_results as
                | Record<string, unknown>
                | undefined
              )?.review,
          final_report:
            typeof data.final_report === "string"
              ? data.final_report
              : null,
        },
        run.runId,
        run.objective
      );

      /* ---------------------------------------
         GET SAVED REPORT
      --------------------------------------- */

      if (reportId) {
        try {
          const reportResponse = await fetch(
            `${BASE}/reports/${encodeURIComponent(reportId)}`,
            {
              cache: "no-store",
            }
          );

          if (reportResponse.ok) {
            const savedReport =
              await reportResponse.json();

            // Preserve the richer streamed agent data.
            const savedNormalized = normalizeReport(
              savedReport,
              run.runId,
              run.objective
            );

            run.report = {
              ...savedNormalized,
              plan: run.report?.plan ?? savedNormalized.plan,
              research_findings:
                run.report?.research_findings ??
                savedNormalized.research_findings,
              analysis:
                run.report?.analysis ??
                savedNormalized.analysis,
              review:
                run.report?.review ??
                savedNormalized.review,
            };
          }
        } catch {
          // Keep streamed report data as fallback.
        }
      }

      continue;
    }

    /* -----------------------------------------
       RESEARCH ERROR
    ----------------------------------------- */

    if (eventName === "research_error") {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : typeof data.message === "string"
            ? data.message
            : "Research execution failed.";

      addEvent(
        run,
        "system",
        "failed",
        message,
        data
      );

      continue;
    }
  }
}

// Handle a stream ending without an explicit final status.
if (
  run.status === "pending" ||
  run.status === "running"
) {
  run.status = "completed";
  run.currentPhase = "Research workflow completed.";
  run.updatedAt = now();
}

} catch (error) {
/* -----------------------------------------
USER CANCELLATION
----------------------------------------- */

if (
  error instanceof DOMException &&
  error.name === "AbortError"
) {
  run.cancelled = true;
  run.status = "cancelled";
  run.currentPhase = "Research cancelled.";
  run.updatedAt = now();

  addEvent(
    run,
    "system",
    "cancelling",
    "Research execution cancelled."
  );

  return;
}

/* -----------------------------------------
   OTHER ERROR
----------------------------------------- */

const message =
  error instanceof Error
    ? error.message
    : String(error);

addEvent(
  run,
  "system",
  "failed",
  message
);

}
}

/* =========================================================
CREATE RUN
========================================================= */

export async function createRun(
objective: string
): Promise<{
run_id: string;
}> {
const runId = createRunId();

const run: LocalRun = {
runId,
objective,
createdAt: now(),
updatedAt: now(),
status: "pending",
currentPhase: "Starting research...",
approved: null,
revisionCount: 0,
cancelled: false,
error: null,
events: [],
report: null,
backendReportId: null,
controller: new AbortController(),
};

runs.set(runId, run);

// Start backend research without blocking the UI.
void startResearch(run);

return {
run_id: runId,
};
}

/* =========================================================
LIST RUNS
========================================================= */

export async function listRuns(): Promise<{
runs: RunSummary[];
}> {
const response = await fetch(`${BASE}/reports`, {
cache: "no-store",
});
const savedReports = await json<SavedReport[]>(response);

const localRuns = Array.from(runs.values()).map(
  (run): RunSummary => ({
    run_id:
      run.status === "completed" && run.backendReportId
        ? run.backendReportId
        : run.runId,
    objective: run.objective,
    status: run.status,
    approved: run.approved,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
  })
);

// The backend report list is the durable source of history. Keep
// local active runs for live progress, and avoid showing a completed
// local run twice after its database record appears.
const localReportIds = new Set(
  Array.from(runs.values())
    .map((run) => run.backendReportId)
    .filter((id): id is string => id !== null)
);

const persistedRuns: RunSummary[] = savedReports
  .filter((report) => !localReportIds.has(String(report.id)))
  .map((report) => ({
    run_id: String(report.id),
    objective: report.user_query,
    status: "completed",
    approved: true,
    created_at: report.created_at,
    updated_at: report.created_at,
  }));

return {
runs: [...localRuns, ...persistedRuns].sort(
  (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
),
};
}

/* =========================================================
GET RUN STATUS
========================================================= */

export async function getRunStatus(
runId: string
): Promise<RunStatus> {
const run = findLocalRun(runId);

if (!run) {
const report = await getSavedReport(runId);
return {
  run_id: String(report.id),
  objective: report.user_query,
  status: "completed",
  current_phase: "Research workflow completed.",
  approved: true,
  revision_count: 0,
  cancelled: false,
  error: null,
  created_at: report.created_at,
  updated_at: report.created_at,
  tasks: [],
};
}

return {
run_id: run.runId,
objective: run.objective,
status: run.status,
current_phase: run.currentPhase,
approved: run.approved,
revision_count: run.revisionCount,
cancelled: run.cancelled,
error: run.error,
created_at: run.createdAt,
updated_at: run.updatedAt,
tasks: [],
};
}

/* =========================================================
GET RUN EVENTS
========================================================= */

export async function getRunEvents(
runId: string,
sinceId = 0
): Promise<{
events: RunEvent[];
}> {
const run = findLocalRun(runId);

if (run?.events.length) {
  return {
    events: run.events.filter(
      (event) => Number(event.id) > sinceId
    ),
  };
}

const report = await getSavedReport(runId);
const events: RunEvent[] = [];
const timestamp = report.created_at;

if (Array.isArray(report.activity_events)) {
  for (const [index, rawEvent] of report.activity_events.entries()) {
    if (!rawEvent || typeof rawEvent !== "object") continue;
    const event = rawEvent as Record<string, unknown>;
    events.push({
      id: index + 1,
      run_id: String(report.id),
      timestamp:
        typeof event.timestamp === "string" ? event.timestamp : timestamp,
      agent: normalizeAgent(event.agent),
      status: normalizeStatus(event.status),
      message:
        typeof event.message === "string"
          ? event.message
          : `${String(event.agent ?? "Agent")} update`,
      data:
        event.data && typeof event.data === "object"
          ? event.data as Record<string, unknown>
          : event,
    });
  }
}

const outputs = report.agent_results;
if (outputs) {
  let nextPersistedEventId =
    events.reduce((highest, event) => Math.max(highest, event.id), 0) + 1;
  const resultEvents: Array<{
    key: string;
    agent: RunEvent["agent"];
    title: string;
  }> = [
    { key: "research_plan", agent: "planner", title: "Planner execution plan" },
    { key: "market_research", agent: "market", title: "Market research results" },
    { key: "company_research", agent: "company", title: "Company research results" },
    { key: "competitor_research", agent: "competitor", title: "Competitor research results" },
    { key: "analysis", agent: "analysis", title: "Business analysis" },
    { key: "draft", agent: "writer", title: "Writer draft" },
    { key: "review", agent: "reviewer", title: "Reviewer feedback" },
    { key: "final_report", agent: "final_report", title: "Final research report" },
  ];

  for (const output of resultEvents) {
    const value = outputs[output.key];
    if (value === undefined || value === null || value === "") continue;

    const alreadyRecorded = events.some(
      (event) =>
        event.agent === output.agent &&
        event.status === "completed" &&
        event.data !== null &&
        (output.key in event.data || event.data.result !== undefined)
    );
    if (alreadyRecorded) continue;

    events.push({
      id: nextPersistedEventId++,
      run_id: String(report.id),
      timestamp,
      agent: output.agent,
      status: "completed",
      message: `${output.title} received.`,
      data: { [output.key]: value, result: value },
    });
  }
}

// Older report rows predate activity persistence. Build the stage views from
// sections that are present in the saved report, without adding missing-log
// or reviewer-warning copy to the Activity page.
if (events.length === 0 && report.final_report?.trim()) {
  const content = report.final_report.trim();
  const sections = content
    .split(/(?=^#{1,6}\s+[^\n]+$)/m)
    .map((section) => {
      const lines = section.trim().split(/\r?\n/);
      const heading = lines[0]?.replace(/^#{1,6}\s+/, "").trim() || "Report overview";
      return { heading, body: lines.slice(1).join("\n").trim() || section.trim() };
    })
    .filter((section) => section.body);
  const byTopic = (pattern: RegExp) => sections
    .filter((section) => pattern.test(section.heading))
    .map((section) => `## ${section.heading}\n\n${section.body}`)
    .join("\n\n");
  const fullText = (value: string) => value || content;
  const plan = sections.map((section, index) => ({
    id: index + 1,
    title: section.heading,
    description: section.body.slice(0, 240),
  }));
  const stageEvents: Array<{
    agent: RunEvent["agent"];
    message: string;
    data: Record<string, unknown>;
  }> = [
    { agent: "planner", message: `Research plan: ${sections.length} report sections.`, data: { research_plan: plan } },
    { agent: "market", message: "Market research details loaded.", data: { market_research: [{ task_id: 1, task_title: "Market research", summary: fullText(byTopic(/market|industry|demand|trend|growth|customer/i)), key_points: [], source_urls: [] }] } },
    { agent: "company", message: "Company research details loaded.", data: { company_research: [{ task_id: 1, task_title: "Company research", summary: fullText(byTopic(/company|business|financial|revenue|operation|product|strategy/i)), key_points: [], source_urls: [] }] } },
    { agent: "competitor", message: "Competitive research details loaded.", data: { competitor_research: [{ task_id: 1, task_title: "Competitive research", summary: fullText(byTopic(/competit|peer|rival|landscape|position|comparison/i)), key_points: [], source_urls: [] }] } },
    { agent: "analysis", message: "Analysis details loaded.", data: { analysis: fullText(byTopic(/analysis|insight|risk|opportun|conclusion|recommendation|executive|implication/i)) } },
    { agent: "writer", message: "Saved report draft loaded.", data: { draft: content } },
    { agent: "reviewer", message: "Approved report available.", data: { review: { approved: true, completeness: "Approved report", relevance: "Approved report", consistency: "Approved report", factual_support: "Approved report", feedback: "The saved report is approved and available.", required_changes: [] } } },
    { agent: "final_report", message: "Final report loaded.", data: { final_report: content } },
  ];
  events.push(...stageEvents.map((event, index) => ({
    id: index + 1,
    run_id: String(report.id),
    timestamp,
    status: "completed" as const,
    ...event,
  })));
}

return {
  events: events.filter((event) => event.id > sinceId),
};
}

/* =========================================================
GET REPORT
========================================================= */

export async function getReport(
runId: string
): Promise<ReportData> {
const run = findLocalRun(runId);

if (!run) {
const raw = await getSavedReport(runId);
return normalizeReport(raw, runId, raw.user_query);
}

// Streamed completion can arrive with partial report data. Only treat
// the local report as ready when it contains the final report text.
if (run.report?.final_report?.trim()) {
return run.report;
}

if (run.backendReportId) {
const raw = await getSavedReport(run.backendReportId);

const savedReport = normalizeReport(
  raw,
  run.runId,
  run.objective
);

run.report = {
  ...savedReport,
  ...run.report,
  final_report:
    savedReport.final_report ?? run.report?.final_report ?? null,
  approved: savedReport.approved ?? run.report?.approved ?? true,
};

return run.report;

}

if (run.report) {
return run.report;
}

throw new Error(
"The final research report is not ready yet."
);
}

async function getSavedReport(id: string): Promise<SavedReport> {
  const response = await fetch(
    `${BASE}/reports/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  );
  return json<SavedReport>(response);
}

export async function deleteSavedReport(id: string): Promise<void> {
  const response = await fetch(
    `${BASE}/reports/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  await json<{ message: string; report_id: number }>(response);
}

/* =========================================================
CANCEL RUN
========================================================= */

export async function cancelRun(
runId: string
): Promise<{
run_id: string;
status: string;
}> {
const run = runs.get(runId);

if (!run) {
return {
run_id: runId,
status: "not_found",
};
}

run.controller.abort();

return {
run_id: runId,
status: "cancelled",
};
}
