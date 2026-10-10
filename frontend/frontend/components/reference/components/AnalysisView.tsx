import {
  Flag,
  GitCompare,
  Lightbulb,
  Repeat,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { Analysis } from "../types";
import Section from "./Section";

const GROUPS: { key: keyof Analysis; label: string; icon: LucideIcon }[] = [
  { key: "trends", label: "Trends", icon: TrendingUp },
  { key: "patterns", label: "Patterns", icon: Repeat },
  { key: "comparisons", label: "Comparisons", icon: GitCompare },
  { key: "insights", label: "Insights", icon: Lightbulb },
  { key: "conclusions", label: "Conclusions", icon: Flag },
];

type AnalysisGroup = keyof Analysis;

function classifyHeading(heading: string): AnalysisGroup {
  const value = heading.toLowerCase();
  if (/trend|driver|demand|adoption|market overview|market structure|market size|market growth|customer|industry/.test(value)) return "trends";
  if (/pattern|cross.source|market gap|evidence gap|ecosystem|value chain|supply chain/.test(value)) return "patterns";
  if (/compar|compet|company|player|landscape|position|rival/.test(value)) return "comparisons";
  if (/conclusion|executive|business relevance|summary|recommendation/.test(value)) return "conclusions";
  return "insights";
}

function cleanTakeaway(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((?:https?:\/\/)[^)]+\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(items: string[]): string[] {
  return items
    .map(cleanTakeaway)
    .filter((item) => Boolean(item) && !/^sources?:?$/i.test(item))
    .slice(0, 3)
    .map((item) =>
      item.length > 240 ? `${item.slice(0, 237).trimEnd()}…` : item,
    );
}

function analysisCards(analysis: Analysis | string) {
  const contents: Record<AnalysisGroup, string[]> = {
    trends: [], patterns: [], comparisons: [], insights: [], conclusions: [],
  };

  if (typeof analysis !== "string") {
    for (const group of GROUPS) {
      const values = analysis[group.key];
      if (Array.isArray(values)) contents[group.key].push(...values.map(String));
      else if (typeof values === "string") contents[group.key].push(values);
    }
  } else {
    const normalized = analysis.replace(/\r\n/g, "\n");
    const sections = normalized.split(/(?=^(?:#{1,6}\s+|\d+[.)]\s+)[^\n]+$)/m);
    for (const section of sections) {
      const lines = section.trim().split("\n");
      const heading = lines[0]?.replace(/^(?:#{1,6}\s+|\d+[.)]\s+)/, "").trim() ?? "";
      if (/sources?|references?|citations?/i.test(heading)) continue;
      const bodyLines = lines.slice(heading ? 1 : 0);
      const group = heading ? classifyHeading(heading) : "insights";
      const text = bodyLines.join("\n").trim();
      const takeaways = text
        .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map(cleanTakeaway)
        .filter(Boolean);
      contents[group].push(...takeaways);
    }
    if (Object.values(contents).every((items) => items.length === 0)) {
      contents.insights.push(...normalized.split(/\n+|(?<=[.!?])\s+/));
    }
  }

  return GROUPS.map((group) => ({
    ...group,
    content: compact(contents[group.key]),
  }));
}

export default function AnalysisView({
  analysis,
}: {
  analysis: Analysis | string | null;
}) {
  if (!analysis) {
    return (
      <Section title="Analysis">
        <p className="text-sm text-text-muted">
          Analysis will appear here as soon as the Analysis Agent completes.
        </p>
      </Section>
    );
  }

  const cards = analysisCards(analysis);
  if (cards.length === 0) {
    return (
      <Section title="Analysis">
        <p className="text-sm text-text-muted">The Analysis Agent did not return any analysis for this run.</p>
      </Section>
    );
  }

  return (
    <Section title="Analysis">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map(({ key, label, icon: Icon, content }) => (
          <article key={key} className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface-2/50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <Icon size={15} className="shrink-0 text-accent" />
              {label}
            </h3>
            <ul className="list-disc space-y-1.5 break-words pl-4 text-sm leading-relaxed text-text-secondary [overflow-wrap:anywhere]">
              {content.length > 0
                ? content.map((item, index) => <li key={index}>{item}</li>)
                : <li className="-ml-4 list-none text-text-muted">No clear takeaway identified yet.</li>}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
