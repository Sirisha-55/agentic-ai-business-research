import {
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  ListTodo,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import AgentOutputView from "../components/AgentOutputView";
import AgentTimeline from "../components/AgentTimeline";
import AgentWorkflow from "../components/AgentWorkflow";
import Button from "../components/Button";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";

import type {
  AgentKey,
  Analysis,
  PlanTask,
  ResearchFinding,
  Review,
  RunEvent,
  RunStatus,
  Source,
} from "../types";

type TaskProgressStatus = "waiting" | "running" | "completed" | "failed";

type ActivityPageProps = {
  runStatus: RunStatus;
  events: RunEvent[];
  isRunning: boolean;
  cancelling: boolean;
  onCancel: () => void;
  plan: PlanTask[];
  findings: ResearchFinding[];
  sources: Source[];
  analysis: Analysis | null;
  draftFirst: string | null;
  reviewFirst: Review | null;
  finalReport: string | null;
  revisionPending: boolean;
  neverApproved: boolean;
  selectedAgent: AgentKey | null;
  onSelectAgent: (agent: AgentKey) => void;
  onViewReport: () => void;
  onRetry: () => void;
};

function normalizeStatus(value: unknown): TaskProgressStatus | null {
  if (typeof value !== "string") return null;

  const status = value.toLowerCase();
  if (
    status === "waiting" ||
    status === "pending" ||
    status === "queued"
  ) {
    return "waiting";
  }
  if (status === "running" || status === "in_progress") {
    return "running";
  }
  if (status === "completed" || status === "complete" || status === "success") {
    return "completed";
  }
  if (status === "failed" || status === "error") {
    return "failed";
  }
  return null;
}

function getTaskEventValue(
  event: RunEvent,
  key: string,
): unknown {
  const eventRecord = event as unknown as Record<string, unknown>;
  const data =
    eventRecord.data && typeof eventRecord.data === "object"
      ? (eventRecord.data as Record<string, unknown>)
      : {};
  return (
    eventRecord[key] ??
    data[key] ??
    (key === "task_status" ? data.status : undefined)
  );
}

function getTaskStatus(
  task: PlanTask,
  events: RunEvent[],
): TaskProgressStatus {
  const taskId = String(task.id);

  // Use the most recent event carrying this task's status.
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    const eventTaskId = getTaskEventValue(event, "task_id");
    const rawStatus =
      getTaskEventValue(event, "task_status") ??
      getTaskEventValue(event, "status");

    if (
      eventTaskId !== undefined &&
      String(eventTaskId) === taskId
    ) {
      const status = normalizeStatus(rawStatus);
      if (status) return status;
    }
  }

  // Until task-specific progress events arrive, don't pretend that a task
  // is running or completed. It remains waiting.
  return "waiting";
}

function TaskStatusIcon({ status }: { status: TaskProgressStatus }) {
  if (status === "completed") {
    return <CheckCircle2 size={16} className="text-success" />;
  }
  if (status === "running") {
    return <LoaderCircle size={16} className="animate-spin text-accent" />;
  }
  if (status === "failed") {
    return <XCircle size={16} className="text-error" />;
  }
  return <Clock3 size={16} className="text-text-muted" />;
}

function statusLabel(status: TaskProgressStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}

export default function ActivityPage({
  runStatus,
  events,
  isRunning,
  cancelling,
  onCancel,
  plan,
  findings,
  sources,
  analysis,
  draftFirst,
  reviewFirst,
  finalReport,
  revisionPending,
  neverApproved,
  selectedAgent,
  onSelectAgent,
  onViewReport,
  onRetry,
}: ActivityPageProps) {
  const completedTasks = plan.filter(
    (task) => getTaskStatus(task, events) === "completed",
  ).length;
  const runningTasks = plan.filter(
    (task) => getTaskStatus(task, events) === "running",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agent Activity"
        subtitle={runStatus.objective}
        action={
          isRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={cancelling || runStatus.cancelled}
            >
              <Ban size={14} />
              {runStatus.cancelled ? "Cancelling..." : "Cancel run"}
            </Button>
          ) : finalReport ? (
            <Button size="sm" onClick={onViewReport}>
              <FileCheck2 size={14} />
              View Report
            </Button>
          ) : undefined
        }
      />

      {/* Run Status */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-subtle">
        <StatusBadge status={runStatus.status} />
        <span className="text-xs text-text-muted">
          Run ID: {runStatus.run_id}
        </span>
      </div>

      {runStatus.status === "failed" && (
        <ErrorState details={runStatus.error} onRetry={onRetry} />
      )}

      {/* Existing Execution Flow - intentionally unchanged */}
      <AgentWorkflow
        events={events}
        finalReportReady={!!finalReport}
        onSelectAgent={onSelectAgent}
      />

      {/* Existing Timeline and Agent Output */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <AgentTimeline events={events} />

        <div className="flex min-w-0 flex-col gap-6">
          <AgentOutputView
            selectedAgent={selectedAgent}
            onSelectAgent={onSelectAgent}
            plan={plan}
            findings={findings}
            sources={sources}
            analysis={analysis}
            draftFirst={draftFirst}
            reviewFirst={reviewFirst}
          />

          {/* Execution Plan directly below Agent Output */}
          <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Execution Plan
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {plan.length} research subtask{plan.length === 1 ? "" : "s"}
                </p>
              </div>

              {plan.length > 0 && (
                <p className="text-xs text-text-muted">
                  {completedTasks}/{plan.length} completed
                  {runningTasks > 0 ? ` · ${runningTasks} running` : ""}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {plan.map((task) => {
                const status = getTaskStatus(task, events);

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface-2/50 p-3"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                      <ListTodo size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {task.title}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-text-secondary">
                        {task.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1">
                      <TaskStatusIcon status={status} />
                      <span className="text-xs font-medium text-text-secondary">
                        {statusLabel(status)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {plan.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-5 text-sm text-text-muted">
                  <Circle size={15} />
                  Planner subtasks will appear here when the plan is generated.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Revision Status */}
      {revisionPending && (
        <p className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          The Reviewer Agent rejected the first draft — the Writer Agent is
          producing a revised report. The report will be ready once the revision
          is reviewed.
        </p>
      )}

      {neverApproved && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          The Reviewer Agent rejected the report. No final report was approved.
        </p>
      )}

      {finalReport && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 size={15} />
          Report approved and ready to view.
        </p>
      )}
    </div>
  );
}
