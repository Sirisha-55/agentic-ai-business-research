"use client";

import {
  AlertTriangle,
  Bot,
  History as HistoryIcon,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  cancelRun,
  createRun,
  deleteSavedReport,
  getHealth,
  getReport,
  getRunEvents,
  getRunStatus,
  listRuns,
} from "./api";

import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import Sidebar from "./components/layout/Sidebar";
import TopNavbar from "./components/layout/TopNavbar";

import {
  deriveAnalysis,
  deriveDraftFirst,
  deriveFinalReport,
  deriveNeverApproved,
  derivePlan,
  deriveResearch,
  deriveReviewFirst,
  deriveRevisionPending,
} from "./deriveFromEvents";

import ActivityPage from "./pages/ActivityPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import NewResearchPage from "./pages/NewResearchPage";
import type { PageKey } from "./pages/pageKey";
import ReportsPage from "./pages/ReportsPage";

import type {
  AgentKey,
  HealthStatus,
  ReportData,
  RunEvent,
  RunStatus,
  RunSummary,
} from "./types";

const POLL_INTERVAL_MS = 1500;
const HISTORY_POLL_MS = 4000;

const ACTIVE_STATUSES = new Set(["pending", "running"]);

const PAGE_META: Record<
  PageKey,
  { title: string; breadcrumb?: string }
> = {
  dashboard: {
    title: "Dashboard",
  },

  new: {
    title: "New Research",
  },

  history: {
    title: "Research History",
  },

  activity: {
    title: "Agent Activity",
    breadcrumb: "Research",
  },

  reports: {
    title: "Reports",
    breadcrumb: "Research",
  },
};

export default function App() {
  // ---------------------------------------------------------
  // APPLICATION STATE
  // ---------------------------------------------------------

  const [health, setHealth] =
    useState<HealthStatus | null>(null);

  const [runs, setRuns] =
    useState<RunSummary[]>([]);

  const [runId, setRunId] =
    useState<string | null>(null);

  const [runStatus, setRunStatus] =
    useState<RunStatus | null>(null);

  const [events, setEvents] =
    useState<RunEvent[]>([]);

  const [report, setReport] =
    useState<ReportData | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [cancelling, setCancelling] =
    useState(false);

  const [historyRefreshToken, setHistoryRefreshToken] =
    useState(0);

  const [selectedAgent, setSelectedAgent] =
    useState<AgentKey | null>(null);

  const [page, setPage] =
    useState<PageKey>("dashboard");

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  // ---------------------------------------------------------
  // REFS
  // ---------------------------------------------------------

  const pollTimer =
    useRef<number | null>(null);

  const currentRunIdRef =
    useRef<string | null>(null);

  const autoNavigatedRunId =
    useRef<string | null>(null);

  // ---------------------------------------------------------
  // INITIAL BACKEND HEALTH CHECK
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((result) => {
        if (!cancelled) {
          setHealth(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------
  // LOAD RESEARCH HISTORY
  // ---------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadHistory = () => {
      listRuns()
        .then((result) => {
          if (!cancelled) {
            setRuns(result.runs ?? []);
          }
        })
        .catch(() => {
          // History failures should not break the workspace.
        });
    };

    loadHistory();

    const timer = window.setInterval(
      loadHistory,
      HISTORY_POLL_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [historyRefreshToken]);

  // ---------------------------------------------------------
  // STOP POLLING
  // ---------------------------------------------------------

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ---------------------------------------------------------
  // POLL CURRENT RUN
  // ---------------------------------------------------------

  const poll = useCallback(
    async (id: string): Promise<RunStatus | null> => {
      try {
        const [status, eventsResult] =
          await Promise.all([
            getRunStatus(id),
            getRunEvents(id, 0),
          ]);

        // Ignore stale responses from a previous run.
        if (currentRunIdRef.current !== id) {
          return null;
        }

        setError(null);

        setRunStatus(status);

        setEvents(eventsResult.events ?? []);

        // When research finishes, load the complete report.
        if (status.status === "completed") {
          const result = await getReport(id);

          if (currentRunIdRef.current !== id) {
            return null;
          }

          setReport(result);
        } else {
          setReport(null);
        }

        return status;
      } catch (err) {
        if (currentRunIdRef.current === id) {
          setError(
            err instanceof Error
              ? err.message
              : String(err),
          );
        }

        return null;
      }
    },
    [],
  );

  // ---------------------------------------------------------
  // START POLLING LOOP
  // ---------------------------------------------------------

  const startPollingLoop = useCallback(
    (id: string) => {
      stopPolling();

      currentRunIdRef.current = id;

      let consecutiveFailures = 0;

      const tick = async () => {
        const status = await poll(id);

        if (currentRunIdRef.current !== id) {
          return;
        }

        if (!status) {
          consecutiveFailures += 1;

          // Allow temporary network problems.
          if (consecutiveFailures >= 10) {
            stopPolling();
          }

          return;
        }

        consecutiveFailures = 0;

        if (!ACTIVE_STATUSES.has(status.status)) {
          stopPolling();

          setHistoryRefreshToken(
            (value) => value + 1,
          );
        }
      };

      void tick();

      pollTimer.current =
        window.setInterval(
          tick,
          POLL_INTERVAL_MS,
        );
    },
    [poll, stopPolling],
  );

  // ---------------------------------------------------------
  // START NEW RESEARCH
  // ---------------------------------------------------------

  async function handleSubmit(
    objective: string,
  ): Promise<boolean> {
    const cleanObjective = objective.trim();

    if (!cleanObjective) {
      setError(
        "Please enter a business research objective.",
      );

      return false;
    }

    setError(null);
    setReport(null);
    setEvents([]);
    setRunStatus(null);
    setSelectedAgent(null);

    autoNavigatedRunId.current = null;

    try {
      const result =
        await createRun(cleanObjective);

      const newRunId = result.run_id;

      setRunId(newRunId);

      setHistoryRefreshToken(
        (value) => value + 1,
      );

      startPollingLoop(newRunId);

      setPage("activity");

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err),
      );

      return false;
    }
  }

  // ---------------------------------------------------------
  // SELECT EXISTING RESEARCH
  // ---------------------------------------------------------

  function handleSelectRun(id: string) {
    setError(null);

    setReport(null);
    setEvents([]);
    setRunStatus(null);

    setRunId(id);
    setSelectedAgent(null);

    autoNavigatedRunId.current = null;

    startPollingLoop(id);

    setPage("activity");
  }

  async function handleDeleteRun(id: string) {
    await deleteSavedReport(id);
    setRuns((current) => current.filter((run) => run.run_id !== id));

    if (runId === id || report?.run_id === id) {
      stopPolling();
      currentRunIdRef.current = null;
      setRunId(null);
      setRunStatus(null);
      setEvents([]);
      setReport(null);
      setError(null);
      setSelectedAgent(null);
      autoNavigatedRunId.current = null;
    }
  }

  // ---------------------------------------------------------
  // START NEW RESEARCH SCREEN
  // ---------------------------------------------------------

  function handleNew() {
    stopPolling();

    currentRunIdRef.current = null;

    setRunId(null);
    setRunStatus(null);
    setEvents([]);
    setReport(null);
    setError(null);
    setSelectedAgent(null);

    autoNavigatedRunId.current = null;

    setPage("new");
    setMobileSidebarOpen(false);
  }

  // ---------------------------------------------------------
  // CANCEL CURRENT RESEARCH
  // ---------------------------------------------------------

  async function handleCancel() {
    if (!runId) {
      return;
    }

    setCancelling(true);

    try {
      await cancelRun(runId);

      // Immediately refresh the current state.
      await poll(runId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err),
      );
    } finally {
      setCancelling(false);
    }
  }

  // ---------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------

  function navigate(target: PageKey) {
    setPage(target);
    setMobileSidebarOpen(false);
  }

  // ---------------------------------------------------------
  // CURRENT RUN STATUS
  // ---------------------------------------------------------

  const isRunning =
    runStatus !== null &&
    ACTIVE_STATUSES.has(runStatus.status);

  // ---------------------------------------------------------
  // DERIVE AGENT OUTPUTS
  // ---------------------------------------------------------

  const plan =
    report?.plan ??
    derivePlan(events);

  const researchData = report
    ? {
        sources:
          report.sources ?? [],
      }
    : deriveResearch(events);

  const sources =
    researchData.sources;

  const analysis =
    report?.analysis ??
    deriveAnalysis(events);

  // ---------------------------------------------------------
  // WRITER / REVIEWER OUTPUT
  //
  // IMPORTANT:
  // We intentionally use only Writer + Reviewer.
  // There are NO separate revision cards.
  //
  // If the reviewer requests changes, the backend can execute:
  //
  // Writer → Reviewer → Writer → Reviewer
  //
  // using the SAME two agents.
  // ---------------------------------------------------------

  const draftFirst =
    deriveDraftFirst(events);

  const reviewFirst =
    deriveReviewFirst(events);

  // ---------------------------------------------------------
  // FINAL REPORT
  // ---------------------------------------------------------

  const approved =
    report?.approved ??
    runStatus?.approved ??
    null;

  const finalReport =
    approved === false
      ? null
      : report?.final_report ?? deriveFinalReport(events);

  const revisionPending =
    !report &&
    deriveRevisionPending(events);

  const neverApproved =
    !revisionPending &&
    deriveNeverApproved(events);

  // ---------------------------------------------------------
  // AUTO OPEN REPORT AFTER COMPLETION
  // ---------------------------------------------------------

  useEffect(() => {
    if (
      runId &&
      finalReport &&
      autoNavigatedRunId.current !== runId
    ) {
      autoNavigatedRunId.current = runId;

      setPage("reports");
    }
  }, [runId, finalReport]);

  // ---------------------------------------------------------
  // API KEY WARNING
  // ---------------------------------------------------------

  const keysMissing =
    health !== null &&
    (
      !health.gemini_configured ||
      !health.tavily_configured
    );

  // ---------------------------------------------------------
  // SYSTEM ONLINE
  //
  // Backend is considered online only when:
  // - /health succeeded
  // - Gemini is configured
  // - Tavily is configured
  //
  // This does not depend on whether a research run is active.
  // ---------------------------------------------------------

  const systemOnline =
    health?.status === "healthy";

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <div className="flex min-h-screen bg-bg lg:h-screen">

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <Sidebar
        page={page}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() =>
          setSidebarCollapsed(
            (value) => !value,
          )
        }
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() =>
          setMobileSidebarOpen(false)
        }
      />

      {/* =====================================================
          MAIN APPLICATION AREA
          ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-y-auto">

        {/* ===================================================
            TOP NAVBAR
            =================================================== */}

        <TopNavbar
          title={PAGE_META[page].title}
          breadcrumb={PAGE_META[page].breadcrumb}
          health={health}
          systemOnline={systemOnline}
          onOpenMobileSidebar={() =>
            setMobileSidebarOpen(true)
          }
        />

        {/* ===================================================
            MAIN CONTENT
            =================================================== */}

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">

          <div key={page} className="page-enter mx-auto w-full max-w-6xl">

            {/* =================================================
                CONFIGURATION WARNING
                ================================================= */}

            {keysMissing && (
              <p className="mb-6 flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">

                <AlertTriangle size={13} />

                {health?.provider === "google" &&
                  !health.gemini_configured &&
                  "GEMINI_API_KEY is not configured. "}

                {health?.gemini_configured === false &&
                  "GEMINI_API_KEY is not configured. "}

                {health &&
                  !health.tavily_configured &&
                  "TAVILY_API_KEY is not configured. "}

                Set these in backend/.env before
                running a research task.

              </p>
            )}

            {/* =================================================
                GENERAL ERROR
                ================================================= */}

            {error && (
              <p className="mb-6 text-sm text-error">
                {error}
              </p>
            )}

            {/* =================================================
                DASHBOARD
                ================================================= */}

            {page === "dashboard" && (
              <DashboardPage
                runs={runs}
                onSelectRun={handleSelectRun}
                onDeleteRun={handleDeleteRun}
                onStartNew={() =>
                  navigate("new")
                }
                onViewMore={() => navigate("history")}
              />
            )}

            {/* =================================================
                NEW RESEARCH
                ================================================= */}

            {page === "new" && (
              <NewResearchPage
                onSubmit={handleSubmit}
              />
            )}

            {/* =================================================
                HISTORY
                ================================================= */}

            {page === "history" && (
              <HistoryPage
                runs={runs}
                selectedRunId={runId}
                onSelectRun={handleSelectRun}
                onDeleteRun={handleDeleteRun}
                onStartNew={() =>
                  navigate("new")
                }
              />
            )}

            {/* =================================================
                AGENT ACTIVITY
                ================================================= */}

            {page === "activity" &&
              (
                runId && runStatus ? (

                  <ActivityPage
                    runStatus={runStatus}
                    events={events}
                    isRunning={isRunning}
                    cancelling={cancelling}
                    onCancel={handleCancel}

                    plan={plan}
                    analysis={analysis}

                    draftFirst={draftFirst}
                    reviewFirst={reviewFirst}

                    finalReport={finalReport}

                    revisionPending={
                      revisionPending
                    }

                    neverApproved={
                      neverApproved
                    }

                    selectedAgent={
                      selectedAgent
                    }

                    onSelectAgent={
                      setSelectedAgent
                    }

                    onViewReport={() =>
                      navigate("reports")
                    }

                    onRetry={() =>
                      navigate("new")
                    }
                  />

                ) : (

                  <EmptyState
                    icon={Bot}
                    title="No research selected"
                    description="Start a new business research task or pick one from your history to watch the agents work."
                    action={
                      <div className="flex gap-2">

                        <Button
                          size="sm"
                          onClick={() =>
                            navigate("new")
                          }
                        >
                          <Sparkles
                            size={14}
                          />
                          Start Research
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(
                              "history",
                            )
                          }
                        >
                          <HistoryIcon
                            size={14}
                          />
                          View History
                        </Button>

                      </div>
                    }
                  />

                )
              )
            }

            {/* =================================================
                REPORTS
                ================================================= */}

            {page === "reports" &&
              (
                runId && runStatus ? (

                  <ReportsPage
                    finalReport={finalReport}
                    objective={
                      runStatus.objective
                    }
                    approved={approved}
                    revisionCount={
                      report?.revision_count ??
                      runStatus.revision_count ??
                      0
                    }
                    sourcesCount={
                      sources.length
                    }
                    generatedAt={
                      report
                        ? runStatus.updated_at
                        : null
                    }
                    onNewResearch={() =>
                      navigate("new")
                    }
                    onGoToActivity={() =>
                      navigate("activity")
                    }
                  />

                ) : (

                  <EmptyState
                    icon={HistoryIcon}
                    title="No report selected"
                    description="Start a new business research task or pick a completed research task from your history to view its report."
                    action={
                      <div className="flex gap-2">

                        <Button
                          size="sm"
                          onClick={() =>
                            navigate("new")
                          }
                        >
                          <Sparkles
                            size={14}
                          />
                          Start Research
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(
                              "history",
                            )
                          }
                        >
                          <HistoryIcon
                            size={14}
                          />
                          View History
                        </Button>

                      </div>
                    }
                  />

                )
              )
            }

          </div>

        </main>

      </div>

    </div>
  );
}
