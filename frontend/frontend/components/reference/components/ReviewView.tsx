import type { Review } from "../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Section from "./Section";
import { linkifyBareUrls } from "../markdown";

export default function ReviewView({
  review,
  title = "Reviewer result",
}: {
  review: Review | string | null;
  title?: string;
}) {
  if (typeof review === "string") {
    const approved = /\bAPPROVED\b/i.test(review) && !/NEEDS_REVISION/i.test(review);

    return (
      <Section title={title}>
        <div className="mb-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${approved ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
            {approved ? "Approved" : "Revision requested"}
          </span>
        </div>
        <article className="report-content prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-info prose-a:underline prose-table:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{linkifyBareUrls(review)}</ReactMarkdown>
        </article>
      </Section>
    );
  }

  if (!review) {
    return (
      <Section title={title}>
        <p className="text-sm text-text-muted">The Reviewer Agent output will appear here when its review is ready.</p>
      </Section>
    );
  }

  return (
    <Section title={title}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            review.approved ? "bg-success/10 text-success" : "bg-error/10 text-error"
          }`}
        >
          {review.approved ? "Approved" : "Rejected"}
        </span>
      </div>

      <p className="mb-3 text-sm text-text-secondary">{review.feedback}</p>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ReviewCriterion label="Completeness" value={review.completeness} />
        <ReviewCriterion label="Relevance" value={review.relevance} />
        <ReviewCriterion label="Consistency" value={review.consistency} />
        <ReviewCriterion label="Factual support" value={review.factual_support} />
      </div>

      {review.required_changes.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Required changes
          </h3>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-text-secondary">
            {review.required_changes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function ReviewCriterion({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-2">
      <p className="font-semibold text-text-muted">{label}</p>
      <p className="mt-0.5 text-text-secondary">{value}</p>
    </div>
  );
}
