import { History, Sparkles } from "lucide-react";

import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import ResearchCard from "../components/ResearchCard";
import type { RunSummary } from "../types";

/*
 * ---------------------------------------------------------
 * START OF DAY
 * ---------------------------------------------------------
 *
 * Used to compare research runs by calendar date rather
 * than by exact timestamp.
 */
function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/*
 * ---------------------------------------------------------
 * DATE GROUP LABEL
 * ---------------------------------------------------------
 *
 * Examples:
 * Today
 * Yesterday
 * Oct 7
 * Oct 6, 2025
 */
function dateGroupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86400000,
  );

  if (diffDays === 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
  });
}

/*
 * ---------------------------------------------------------
 * GROUP RESEARCH RUNS BY DATE
 * ---------------------------------------------------------
 */
function groupByDate(
  runs: RunSummary[],
): { label: string; runs: RunSummary[] }[] {
  const groups: {
    label: string;
    runs: RunSummary[];
  }[] = [];

  for (const run of runs) {
    const label = dateGroupLabel(run.created_at);

    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.label === label) {
      lastGroup.runs.push(run);
    } else {
      groups.push({
        label,
        runs: [run],
      });
    }
  }

  return groups;
}

/*
 * ---------------------------------------------------------
 * HISTORY PAGE
 * ---------------------------------------------------------
 */
export default function HistoryPage({
  runs,
  selectedRunId,
  onSelectRun,
  onStartNew,
}: {
  runs: RunSummary[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  onStartNew: () => void;
}) {
  /*
   * Sort newest research runs first.
   *
   * This makes the latest business research task appear
   * at the top of the history.
   */
  const sortedRuns = [...runs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  );

  const groups = groupByDate(sortedRuns);

  return (
    <div className="flex flex-col gap-6">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}
      <PageHeader
        title="Business Research History"
        subtitle="Review your previous business research tasks, agent execution results, and generated reports."
      />

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}
      {sortedRuns.length === 0 ? (
        <EmptyState
          icon={History}
          title="No business research yet"
          description="Start a business research task to analyze markets, companies, competitors, trends, and opportunities using the AI research agents."
          action={
            <Button
              size="sm"
              onClick={onStartNew}
            >
              <Sparkles size={14} />
              Start Business Research
            </Button>
          }
        />
      ) : (

        /* ===================================================
           RESEARCH HISTORY GROUPS
           =================================================== */
        <div className="flex flex-col gap-6">

          {groups.map((group) => (
            <section
              key={group.label}
              className="flex flex-col"
            >

              {/* Date */}
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {group.label}
              </p>

              {/* Research Cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.runs.map((run) => (
                  <ResearchCard
                    key={run.run_id}
                    run={run}
                    selected={
                      run.run_id === selectedRunId
                    }
                    onClick={() =>
                      onSelectRun(run.run_id)
                    }
                  />
                ))}
              </div>
            </section>
          ))}

        </div>
      )}
    </div>
  );
}