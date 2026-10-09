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
  ResearchFinding,
  Review,
  Source,
} from "../types";
import AnalysisView from "./AnalysisView";
import DraftView from "./DraftView";
import PlanView from "./PlanView";
import ResearchView from "./ResearchView";
import ReviewView from "./ReviewView";

const STAGES: { key: AgentKey; label: string; icon: LucideIcon }[] = [
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
  findings,
  sources,
  analysis,
  draftFirst,
  reviewFirst,
}: {
  selectedAgent: AgentKey | null;
  onSelectAgent: (agent: AgentKey) => void;
  plan: PlanTask[];
  findings: ResearchFinding[];
  sources: Source[];
  analysis: Analysis | null;
  draftFirst: string | null;
  reviewFirst: Review | null;
}) {
  const hasOutput: Record<AgentKey, boolean> = {
    system: false,
    planner: plan.length > 0,
    market: findings.length > 0,
    company: findings.length > 0,
    competitor: findings.length > 0,
    analysis: analysis !== null,
    writer: draftFirst !== null,
    reviewer: reviewFirst !== null,
    final_report: draftFirst !== null && reviewFirst?.approved === true,
  };

  const availableStages = STAGES.filter((stage) => hasOutput[stage.key]);
  const effectiveAgent =
    selectedAgent && hasOutput[selectedAgent]
      ? selectedAgent
      : (availableStages[0]?.key ?? null);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Agent output
        </p>

        {availableStages.length === 0 ? (
          <p className="text-sm text-text-muted">
            No agent has produced output yet — check back once a workflow step
            completes.
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
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition duration-150 ${
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

      {effectiveAgent === "planner" && <PlanView plan={plan} />}

      {(effectiveAgent === "market" ||
        effectiveAgent === "company" ||
        effectiveAgent === "competitor") && (
        <ResearchView findings={findings} sources={sources} />
      )}

      {effectiveAgent === "analysis" && <AnalysisView analysis={analysis} />}

      {effectiveAgent === "writer" && (
        <DraftView draft={draftFirst} title="Business Research Report Draft" />
      )}

      {effectiveAgent === "reviewer" && (
        <ReviewView review={reviewFirst} title="Business Research Review" />
      )}

      {effectiveAgent === "final_report" && (
        <DraftView draft={draftFirst} title="Final Business Research Report" />
      )}
    </div>
  );
}
