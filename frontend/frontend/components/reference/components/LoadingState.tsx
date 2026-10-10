import type { AgentKey } from "../types";

const STAGE_LABELS: {
  key: AgentKey;
  label: string;
}[] = [
  {
    key: "planner",
    label: "Planning the research objective",
  },
  {
    key: "market",
    label: "Researching the market",
  },
  {
    key: "company",
    label: "Analyzing the company",
  },
  {
    key: "competitor",
    label: "Researching competitors",
  },
  {
    key: "analysis",
    label: "Analyzing research findings",
  },
  {
    key: "writer",
    label: "Writing the research report",
  },
  {
    key: "reviewer",
    label: "Reviewing the report",
  },
  {
    key: "final_report",
    label: "Preparing the final report",
  },
];

export default function LoadingState({
  activeAgent,
}: {
  activeAgent?: AgentKey | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {STAGE_LABELS.map((stage) => {
        const active =
          stage.key === activeAgent;

        return (
          <div
            key={stage.key}
            className={`text-sm ${
              active
                ? "text-text-primary"
                : "text-text-muted"
            }`}
          >
            {stage.label}
          </div>
        );
      })}
    </div>
  );
}