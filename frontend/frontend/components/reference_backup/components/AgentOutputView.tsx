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

const STAGES: {
  key: AgentKey;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    key: "planner",
    label: "Planner Agent",
    icon: ListTodo,
  },
  {
    key: "market",
    label: "Market Agent",
    icon: Search,
  },
  {
    key: "company",
    label: "Company Agent",
    icon: Building2,
  },
  {
    key: "competitor",
    label: "Competitor Agent",
    icon: Swords,
  },
  {
    key: "analysis",
    label: "Analysis Agent",
    icon: BrainCircuit,
  },
  {
    key: "writer",
    label: "Writer Agent",
    icon: PenLine,
  },
  {
    key: "reviewer",
    label: "Reviewer Agent",
    icon: ShieldCheck,
  },
  {
    key: "final_report",
    label: "Final Report Agent",
    icon: FileCheck2,
  },
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
  draftRevision: _draftRevision,
  reviewRevision: _reviewRevision,
}: {
  selectedAgent: AgentKey | null;
  onSelectAgent: (agent: AgentKey) => void;
  plan: PlanTask[];
  findings: ResearchFinding[];
  sources: Source[];
  analysis: Analysis | null;
  draftFirst: string | null;
  reviewFirst: Review | null;
  draftRevision: string | null;
  reviewRevision: Review | null;
}) {
  /*
   * The research stage is now split into three agents:
   * Market, Company and Competitor.
   *
   * All three currently use the combined research
   * findings/sources supplied to this component.
   */
  const hasResearchOutput =
    findings.length > 0 ||
    sources.length > 0;

  const finalReportAvailable =
    draftFirst !== null &&
    reviewFirst?.approved === true;

  const hasOutput: Record<AgentKey, boolean> = {
    system: false,

    planner:
      plan.length > 0,

    market:
      hasResearchOutput,

    company:
      hasResearchOutput,

    competitor:
      hasResearchOutput,

    analysis:
      analysis !== null,

    writer:
      draftFirst !== null,

    reviewer:
      reviewFirst !== null,

    final_report:
      finalReportAvailable,
  };

  const availableStages =
    STAGES.filter(
      (stage) => hasOutput[stage.key],
    );

  const effectiveAgent =
    selectedAgent &&
    hasOutput[selectedAgent]
      ? selectedAgent
      : (
          availableStages[0]?.key ??
          null
        );

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

              const available =
                hasOutput[stage.key];

              const selected =
                stage.key ===
                effectiveAgent;

              return (
                <button
                  key={stage.key}
                  type="button"
                  disabled={!available}
                  onClick={() =>
                    onSelectAgent(
                      stage.key,
                    )
                  }
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

      {/* Planner */}
      {effectiveAgent === "planner" && (
        <PlanView
          plan={plan}
        />
      )}

      {/* Market */}
      {effectiveAgent === "market" && (
        <ResearchView
          findings={findings}
          sources={sources}
        />
      )}

      {/* Company */}
      {effectiveAgent === "company" && (
        <ResearchView
          findings={findings}
          sources={sources}
        />
      )}

      {/* Competitor */}
      {effectiveAgent === "competitor" && (
        <ResearchView
          findings={findings}
          sources={sources}
        />
      )}

      {/* Analysis */}
      {effectiveAgent === "analysis" && (
        <AnalysisView
          analysis={analysis}
        />
      )}

      {/* Writer */}
      {effectiveAgent === "writer" && (
        <DraftView
          draft={draftFirst}
          title="Writer draft"
        />
      )}

      {/* Reviewer */}
      {effectiveAgent === "reviewer" && (
        <ReviewView
          review={reviewFirst}
          title="Reviewer result"
        />
      )}

      {/* Final Report */}
      {effectiveAgent === "final_report" && (
        <DraftView
          draft={draftFirst}
          title="Final research report"
        />
      )}
    </div>
  );
}