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

/*
 * Business Research Agents
 *
 * Same reference UI structure.
 * Only agent names/content are Business Research related.
 */
const STAGES: {
  key: AgentKey;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    key: "planner",
    label: "Planner",
    icon: ListTodo,
  },
  {
    key: "market",
    label: "Market",
    icon: Search,
  },
  {
    key: "company",
    label: "Company",
    icon: Building2,
  },
  {
    key: "competitor",
    label: "Competitor",
    icon: Swords,
  },
  {
    key: "analysis",
    label: "Analysis",
    icon: BrainCircuit,
  },
  {
    key: "writer",
    label: "Writer",
    icon: PenLine,
  },
  {
    key: "reviewer",
    label: "Reviewer",
    icon: ShieldCheck,
  },
  {
    key: "final_report",
    label: "Final Report",
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
  /*
   * Market, Company and Competitor agents
   * use the research findings collected from Tavily.
   */
  const hasResearchOutput =
    findings.length > 0 ||
    sources.length > 0;

  /*
   * Final Report is available only when:
   *
   * 1. Writer has produced a draft
   * 2. Reviewer approved it
   */
  const finalReportAvailable =
    draftFirst !== null &&
    reviewFirst?.approved === true;

  /*
   * Determine which agent has output available.
   */
  const hasOutput: Record<
    AgentKey,
    boolean
  > = {
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

  /*
   * Agents whose output can currently
   * be displayed.
   */
  const availableStages =
    STAGES.filter(
      (stage) =>
        hasOutput[stage.key],
    );

  /*
   * Keep the selected agent if its output
   * is available.
   *
   * Otherwise automatically select the
   * first available business research agent.
   */
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
      {/* =====================================================
          AGENT OUTPUT
          Same reference style and colors
          ===================================================== */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Agent output
        </p>

        {availableStages.length === 0 ? (
          <p className="text-sm text-text-muted">
            No agent output yet — check back once a workflow step
            completes.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const Icon =
                stage.icon;

              const available =
                hasOutput[
                  stage.key
                ];

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

      {/* =====================================================
          PLANNER
          ===================================================== */}
      {effectiveAgent ===
        "planner" && (
        <PlanView
          plan={plan}
        />
      )}

      {/* =====================================================
          MARKET
          ===================================================== */}
      {effectiveAgent ===
        "market" && (
        <ResearchView
          findings={findings}
          sources={sources}
        />
      )}

      {/* =====================================================
          COMPANY
          ===================================================== */}
      {effectiveAgent ===
        "company" && (
        <ResearchView
          findings={findings}
          sources={sources}
        />
      )}

      {/* =====================================================
          COMPETITOR
          ===================================================== */}
      {effectiveAgent ===
        "competitor" && (
        <ResearchView
          findings={findings}
          sources={sources}
        />
      )}

      {/* =====================================================
          ANALYSIS
          ===================================================== */}
      {effectiveAgent ===
        "analysis" && (
        <AnalysisView
          analysis={analysis}
        />
      )}

      {/* =====================================================
          WRITER
          ===================================================== */}
      {effectiveAgent ===
        "writer" && (
        <DraftView
          draft={draftFirst}
          title="Business Research Report Draft"
        />
      )}

      {/* =====================================================
          REVIEWER
          ===================================================== */}
      {effectiveAgent ===
        "reviewer" && (
        <ReviewView
          review={reviewFirst}
          title="Business Research Review"
        />
      )}

      {/* =====================================================
          FINAL REPORT
          ===================================================== */}
      {effectiveAgent ===
        "final_report" && (
        <DraftView
          draft={draftFirst}
          title="Final Business Research Report"
        />
      )}
    </div>
  );
}