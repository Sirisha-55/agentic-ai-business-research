import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Section from "./Section";
import { linkifyBareUrls } from "../markdown";

export default function DraftView({
  draft,
  title = "Writer draft",
}: {
  draft: string | null;
  title?: string;
}) {
  if (!draft) {
    return (
      <Section title={title}>
        <p className="text-sm text-text-muted">The Writer Agent output will appear here when the draft is ready.</p>
      </Section>
    );
  }

  return (
    <Section title={title}>
      <article className="report-content prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-info prose-a:underline prose-table:text-xs">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{linkifyBareUrls(draft)}</ReactMarkdown>
      </article>
    </Section>
  );
}
