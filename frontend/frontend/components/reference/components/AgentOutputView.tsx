import {
  BrainCircuit,
  Building2,
  FileCheck2,
  ListTodo,
  PenLine,
  Search,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from "lucide-react";

import type {
  AgentKey,
  Analysis,
  PlanTask,
  Review,
  RunEvent,
} from "../types";

import {
  deriveFinalReport,
  deriveResearchByAgent,
} from "../deriveFromEvents";
import AnalysisView from "./AnalysisView";
import DraftView from "./DraftView";
import PlanView from "./PlanView";
import ResearchView from "./ResearchView";
import ReviewView from "./ReviewView";
import StatusBadge from "./StatusBadge";

const STAGES: {
  key: AgentKey;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "planner", label: "Planner", icon: ListTodo },
  { key: "market", label: "Market", icon: Search },
  { key: "company", label: "Company", icon: Building2 },
  { key: "competitor", label: "Competitor", icon: Swords },
  { key: "analysis", label: "Analysis", icon: BrainCircuit },
  { key: "writer", label: "Writer", icon: PenLine },
  { key: "reviewer", label: "Reviewer", icon: ShieldCheck },
  { key: "final_report", label: "Final Report", icon: FileCheck2 },
];

export default function AgentOutputView({
  selectedAgent,
  onSelectAgent,
  plan,
  analysis,
  draftFirst,
  reviewFirst,
  events,
}: {
  selectedAgent: AgentKey | null;
  onSelectAgent: (agent: AgentKey) => void;
  plan: PlanTask[];
  analysis: Analysis | string | null;
  draftFirst: string | null;
  reviewFirst: Review | string | null;
  events: RunEvent[];
}) {
  const market = deriveResearchByAgent(events, "market");
  const company = deriveResearchByAgent(events, "company");
  const competitor = deriveResearchByAgent(events, "competitor");
  const finalReport = deriveFinalReport(events);
  const hasEnteredStage = (agent: AgentKey) =>
    events.some(
      (event) =>
        event.agent === agent &&
        ["running", "completed", "failed", "cancelling"].includes(event.status),
    );

  const hasOutput: Record<AgentKey, boolean> = {
    system: false,
    planner: plan.length > 0 || hasEnteredStage("planner"),
    market: hasEnteredStage("market"),
    company: hasEnteredStage("company"),
    competitor: hasEnteredStage("competitor"),
    analysis: hasEnteredStage("analysis"),
    writer: hasEnteredStage("writer"),
    reviewer: hasEnteredStage("reviewer"),
    final_report: hasEnteredStage("final_report"),
  };

  const availableStages = STAGES.filter(
    (stage) => hasOutput[stage.key],
  );

  const effectiveAgent =
    selectedAgent && hasOutput[selectedAgent]
      ? selectedAgent
      : availableStages[0]?.key ?? null;

  const displayedResearch =
    effectiveAgent === "market"
      ? market
      : effectiveAgent === "company"
        ? company
        : effectiveAgent === "competitor"
          ? competitor
          : null;
  const researchStage =
    effectiveAgent === "market" ||
    effectiveAgent === "company" ||
    effectiveAgent === "competitor"
      ? effectiveAgent
      : null;
  const assignedTasks = researchStage
    ? plan.filter((task) => task.researcher === researchStage)
    : [];
  const assignedStatuses = assignedTasks.map((task) =>
    [...events]
      .reverse()
      .find(
        (event) =>
          event.agent === researchStage &&
          Number(event.data?.task_id) === task.id,
      )?.status,
  );
  const researchEmptyMessage =
    assignedTasks.length === 0
      ? "The Planner did not assign a subtask to this researcher for this question."
      : assignedStatuses.includes("failed")
        ? "A subtask failed before research results became available."
        : assignedStatuses.includes("running") ||
            assignedStatuses.some((status) => status === undefined || status === "pending")
          ? "Research is in progress. Results will appear here as each subtask finishes."
          : "The research completed, but Tavily returned no results for these subtasks.";

  const currentStageEvent = effectiveAgent
    ? [...events].reverse().find((event) => event.agent === effectiveAgent)
    : undefined;

  const stageStatus = currentStageEvent?.status === "completed"
    ? "completed"
    : currentStageEvent?.status === "failed"
      ? "failed"
      : currentStageEvent?.status === "running"
        ? "running"
        : null;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Agent output
        </p>

        {availableStages.length === 0 ? (
          <p className="text-sm text-text-muted">
            No agent output yet — check back once a workflow step completes.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const available = hasOutput[stage.key];
              const selected = stage.key === effectiveAgent;

              return (
                <button
                  key={stage.key}
                  type="button"
                  disabled={!available}
                  onClick={() => onSelectAgent(stage.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition duration-150 ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : available
                        ? "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-accent"
                        : "cursor-not-allowed border-border/60 bg-surface-2/50 text-text-muted"
                  }`}
                >
                  <Icon size={13} />
                  {stage.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {effectiveAgent && currentStageEvent && stageStatus && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-subtle">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              {STAGES.find((stage) => stage.key === effectiveAgent)?.label} stage
            </p>
            <p className="mt-0.5 break-words text-sm text-text-secondary">
              {currentStageEvent.message}
            </p>
          </div>
          <StatusBadge status={stageStatus} className="shrink-0" />
        </div>
      )}

      {effectiveAgent === "planner" && <PlanView plan={plan} events={events} />}

      {(effectiveAgent === "market" ||
        effectiveAgent === "company" ||
        effectiveAgent === "competitor") && (
        <ResearchView
          title={`${researchStage === "market" ? "Market" : researchStage === "company" ? "Company" : "Competitor"} research results`}
          emptyMessage={researchEmptyMessage}
          findings={displayedResearch?.findings ?? []}
          sources={displayedResearch?.sources ?? []}
        />
      )}

      {effectiveAgent === "analysis" && (
        <AnalysisView analysis={analysis} />
      )}

      {effectiveAgent === "writer" && (
        <DraftView
          draft={draftFirst}
          title="Business Research Report Draft"
        />
      )}

      {effectiveAgent === "reviewer" && (
        <ReviewView
          review={reviewFirst}
          title="Business Research Review"
        />
      )}

      {effectiveAgent === "final_report" && (
        <DraftView
          draft={finalReport}
          title="Final Business Research Report"
        />
      )}
    </div>
  );
}
