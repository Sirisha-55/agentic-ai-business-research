import type { ResearchFinding, Source } from "../types";
import Section from "./Section";
import SourceCard from "./SourceCard";
import LinkedText from "./LinkedText";

export default function ResearchView({
  title = "Research findings",
  emptyMessage = "No research results are available for this stage yet.",
  findings,
  sources,
}: {
  title?: string;
  emptyMessage?: string;
  findings: ResearchFinding[];
  sources: Source[];
}) {
  return (
    <Section
      title={title}
      subtitle={`${sources.length} ${sources.length === 1 ? "source" : "sources"} gathered via Tavily`}
    >
      {findings.length === 0 && sources.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {findings.map((f, index) => (
            <div
              key={`${f.task_id}-${index}`}
              className="rounded-lg border border-border bg-surface-2/50 p-3"
            >
              <p className="text-sm font-medium text-text-primary">{f.task_title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary"><LinkedText>{f.summary}</LinkedText></p>
              {f.key_points.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-text-secondary">
                  {f.key_points.map((p, i) => (
                    <li key={i}><LinkedText>{p}</LinkedText></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Sources</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map((s) => (
              <SourceCard key={s.url} source={s} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
