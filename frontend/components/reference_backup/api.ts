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

   Backend names may be:
   Planner Agent
   Market Agent
   Company Agent
   etc.

   Convert them into our AgentKey values.
========================================================= */

function normalizeAgent(
  value: unknown
): RunEvent["agent"] {
  const name = String(value ?? "").toLowerCase();

  if (name.includes("planner")) {
    return "planner";
  }

  if (name.includes("market")) {
    return "market";
  }

  if (name.includes("company")) {
    return "company";
  }

  if (name.includes("competitor")) {
    return "competitor";
  }

  if (name.includes("analysis")) {
    return "analysis";
  }

  if (name.includes("writer")) {
    return "writer";
  }

  if (name.includes("reviewer")) {
    return "reviewer";
  }

  if (name.includes("final")) {
    return "final_report";
  }

  return "system";
}

/* =========================================================
   EVENT STATUS NORMALIZATION
========================================================= */

function normalizeStatus(
  value: unknown
): RunEvent["status"] {
  if (value === "running") {
    return "running";
  }

  if (value === "completed") {
    return "completed";
  }

  if (value === "failed" || value === "error") {
    return "failed";
  }

  if (value === "cancelling") {
    return "cancelling";
  }

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

  if (!dataText) {
    return null;
  }

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

    plan: report.plan ?? null,

    research_findings:
      report.research_findings ??
      report.findings ??
      null,

    sources: report.sources ?? null,

    analysis: report.analysis ?? null,

    review: report.review ?? null,

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
        detail =
          body?.detail ??
          detail;
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

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {
      const {
        value,
        done,
      } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(
        value,
        {
          stream: true,
        }
      );

      const blocks =
        buffer.split(
          /\r?\n\r?\n/
        );

      buffer =
        blocks.pop() || "";

      for (const block of blocks) {
        const parsed =
          parseSseBlock(block);

        if (!parsed) {
          continue;
        }

        const {
          eventName,
          data,
        } = parsed;

        /* -----------------------------------------
           RESEARCH STARTED
        ----------------------------------------- */

        if (
          eventName ===
          "research_started"
        ) {
          addEvent(
            run,
            "planner",
            "running",
            typeof data.message ===
              "string"
              ? data.message
              : "Understanding the business objective and creating the research plan.",
            data
          );

          continue;
        }

        /* -----------------------------------------
           AGENT PROGRESS
        ----------------------------------------- */

        if (
          eventName ===
          "agent_progress"
        ) {
          const agent =
            normalizeAgent(
              data.agent
            );

          const status =
            normalizeStatus(
              data.status
            );

          const message =
            typeof data.message ===
            "string"
              ? data.message
              : `${String(
                  data.agent ??
                    "Agent"
                )} is working.`;

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

        if (
          eventName ===
          "research_completed"
        ) {
          const reportId =
            data.report_id != null
              ? String(
                  data.report_id
                )
              : null;

          run.backendReportId =
            reportId;

          addEvent(
            run,
            "final_report",
            "completed",
            "Final reviewed business research report is ready.",
            data
          );

          run.status =
            "completed";

          run.currentPhase =
            "Final report ready.";

          run.updatedAt = now();

          run.report =
            normalizeReport(
              {
                report_id:
                  reportId,

                final_report:
                  typeof data.final_report ===
                  "string"
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
              const reportResponse =
                await fetch(
                  `${BASE}/reports/${encodeURIComponent(
                    reportId
                  )}`,
                  {
                    cache:
                      "no-store",
                  }
                );

              if (
                reportResponse.ok
              ) {
                const savedReport =
                  await reportResponse.json();

                run.report =
                  normalizeReport(
                    savedReport,
                    run.runId,
                    run.objective
                  );
              }
            } catch {
              /*
               * Keep streamed report
               * as fallback.
               */
            }
          }

          continue;
        }

        /* -----------------------------------------
           RESEARCH ERROR
        ----------------------------------------- */

        if (
          eventName ===
          "research_error"
        ) {
          const message =
            typeof data.detail ===
            "string"
              ? data.detail
              : typeof data.message ===
                  "string"
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

    /*
     * If the backend closes the stream
     * without an explicit final status.
     */
    if (
      run.status ===
        "pending" ||
      run.status ===
        "running"
    ) {
      run.status =
        "completed";

      run.currentPhase =
        "Research workflow completed.";

      run.updatedAt = now();
    }
  } catch (error) {
    /* -----------------------------------------
       USER CANCELLATION
    ----------------------------------------- */

    if (
      error instanceof
        DOMException &&
      error.name ===
        "AbortError"
    ) {
      run.cancelled = true;

      run.status =
        "cancelled";

      run.currentPhase =
        "Research cancelled.";

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
  const runId =
    createRunId();

  const run: LocalRun = {
    runId,

    objective,

    createdAt: now(),

    updatedAt: now(),

    status: "pending",

    currentPhase:
      "Starting research...",

    approved: null,

    revisionCount: 0,

    cancelled: false,

    error: null,

    events: [],

    report: null,

    backendReportId: null,

    controller:
      new AbortController(),
  };

  runs.set(
    runId,
    run
  );

  /*
   * Start backend research
   * without blocking UI.
   */
  void startResearch(
    run
  );

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
  const localRuns =
    Array.from(
      runs.values()
    ).map(
      (
        run
      ): RunSummary => ({
        run_id:
          run.runId,

        objective:
          run.objective,

        status:
          run.status,

        approved:
          run.approved,

        created_at:
          run.createdAt,

        updated_at:
          run.updatedAt,
      })
    );

  return {
    runs: localRuns,
  };
}

/* =========================================================
   GET RUN STATUS
========================================================= */

export async function getRunStatus(
  runId: string
): Promise<RunStatus> {
  const run =
    runs.get(runId);

  if (!run) {
    throw new Error(
      "Research run not found."
    );
  }

  return {
    run_id:
      run.runId,

    objective:
      run.objective,

    status:
      run.status,

    current_phase:
      run.currentPhase,

    approved:
      run.approved,

    revision_count:
      run.revisionCount,

    cancelled:
      run.cancelled,

    error:
      run.error,

    created_at:
      run.createdAt,

    updated_at:
      run.updatedAt,

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
  const run =
    runs.get(runId);

  if (!run) {
    return {
      events: [],
    };
  }

  return {
    events:
      run.events.filter(
        (event) =>
          event.id > sinceId
      ),
  };
}

/* =========================================================
   GET REPORT
========================================================= */

export async function getReport(
  runId: string
): Promise<ReportData> {
  const run =
    runs.get(runId);

  if (!run) {
    throw new Error(
      "Research run not found."
    );
  }

  if (run.report) {
    return run.report;
  }

  if (
    run.backendReportId
  ) {
    const response =
      await fetch(
        `${BASE}/reports/${encodeURIComponent(
          run.backendReportId
        )}`,
        {
          cache:
            "no-store",
        }
      );

    const raw =
      await json<unknown>(
        response
      );

    run.report =
      normalizeReport(
        raw,
        run.runId,
        run.objective
      );

    return run.report;
  }

  throw new Error(
    "The final research report is not ready yet."
  );
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
  const run =
    runs.get(runId);

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