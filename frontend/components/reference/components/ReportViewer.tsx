import {
  Check,
  Copy,
  Download,
  FileCheck2,
  Plus,
} from "lucide-react";

import { useMemo, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Button from "./Button";

export default function ReportViewer({
  report,
  objective,
  approved,
  revisionCount,
  sourcesCount,
  generatedAt,
  onNewResearch,
}: {
  report: string;
  objective: string;
  approved: boolean | null;
  revisionCount: number;
  sourcesCount: number;
  generatedAt: string | null;
  onNewResearch?: () => void;
}) {
  const [copied, setCopied] =
    useState(false);

  /*
   * ---------------------------------------------------------
   * CLEAN BUSINESS RESEARCH REPORT
   * ---------------------------------------------------------
   *
   * The actual business research content comes from
   * the backend Writer/Reviewer workflow.
   *
   * Nothing is hard-coded here.
   */
  const cleanReport = useMemo(() => {
    return report
      .replace(/\r\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }, [report]);

  /*
   * ---------------------------------------------------------
   * COPY REPORT
   * ---------------------------------------------------------
   */
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        cleanReport,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      // Clipboard API unavailable.
    }
  }

  /*
   * ---------------------------------------------------------
   * DOWNLOAD BUSINESS RESEARCH REPORT
   * ---------------------------------------------------------
   *
   * Keeps the complete generated Markdown report including:
   * - headings
   * - tables
   * - bullet points
   * - source links
   */
  function handleDownload() {
    const blob = new Blob(
      [cleanReport],
      {
        type: "text/markdown;charset=utf-8",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "business-research-report.md";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /*
   * ---------------------------------------------------------
   * GENERATED DATE
   * ---------------------------------------------------------
   */
  const formattedGeneratedAt =
    generatedAt
      ? new Date(
          generatedAt,
        ).toLocaleString(
          undefined,
          {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          },
        )
      : null;

  return (
    <div className="mx-auto w-full max-w-[900px]">

      {/* =====================================================
          ACTION BUTTONS
          SAME REFERENCE STYLE
          ===================================================== */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          {copied ? (
            <Check size={14} />
          ) : (
            <Copy size={14} />
          )}

          {copied
            ? "Copied"
            : "Copy"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <Download size={14} />
          Download
        </Button>

        {onNewResearch && (
          <Button
            variant="primary"
            size="sm"
            onClick={onNewResearch}
          >
            <Plus size={14} />
            New Research
          </Button>
        )}
      </div>

      {/* =====================================================
          BUSINESS RESEARCH REPORT CONTAINER
          SAME REFERENCE STYLE
          ===================================================== */}
      <div className="rounded-xl border border-border bg-surface shadow-subtle">

        {/* ===================================================
            REPORT HEADER
            =================================================== */}
        <div className="border-b border-border px-6 py-5 sm:px-10 sm:py-8">

          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
            <FileCheck2 size={14} />

            <span>
              Final Report
            </span>
          </div>

          <h1 className="mt-2 text-xl font-semibold leading-snug text-text-primary sm:text-2xl">
            {objective}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">

            {formattedGeneratedAt && (
              <span>
                Generated{" "}
                {formattedGeneratedAt}
              </span>
            )}

            <span>
              {sourcesCount}{" "}
              {sourcesCount === 1
                ? "source"
                : "sources"}
            </span>

            {approved !== null && (
              <span
                className={
                  approved
                    ? "text-success"
                    : "text-text-muted"
                }
              >
                {approved
                  ? "Approved"
                  : "Delivered after revision"}{" "}
                · {revisionCount}{" "}
                {revisionCount === 1
                  ? "revision"
                  : "revisions"}
              </span>
            )}
          </div>
        </div>

        {/* ===================================================
            BUSINESS RESEARCH REPORT BODY
            =================================================== */}
        <div className="px-6 py-6 sm:px-10 sm:py-8">

          <article
            className="
              prose
              prose-sm
              dark:prose-invert
              max-w-none

              prose-headings:font-semibold
              prose-headings:tracking-tight
              prose-headings:text-text-primary

              prose-h1:mb-5
              prose-h1:mt-0
              prose-h1:text-2xl

              prose-h2:mb-3
              prose-h2:mt-8
              prose-h2:text-xl

              prose-h3:mb-2
              prose-h3:mt-6
              prose-h3:text-base

              prose-p:leading-7
              prose-p:text-text-secondary

              prose-li:text-text-secondary
              prose-li:leading-6

              prose-strong:text-text-primary

              prose-a:text-accent
              prose-a:no-underline
              hover:prose-a:underline

              prose-table:w-full
              prose-table:text-xs
              prose-table:overflow-hidden

              prose-thead:border-border
              prose-thead:bg-surface-2

              prose-th:px-3
              prose-th:py-2
              prose-th:text-left
              prose-th:font-semibold
              prose-th:text-text-primary

              prose-td:border-border
              prose-td:px-3
              prose-td:py-2
              prose-td:text-text-secondary
              prose-td:align-top

              prose-tr:border-border

              prose-blockquote:border-l-accent
              prose-blockquote:text-text-secondary

              prose-code:text-text-primary
              prose-pre:bg-surface-2
              prose-pre:border
              prose-pre:border-border
            "
          >
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
              ]}
              components={{

                /*
                 * ------------------------------------------------
                 * EXTERNAL SOURCE LINKS
                 * ------------------------------------------------
                 */
                a({
                  href,
                  children,
                  ...props
                }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },

                /*
                 * ------------------------------------------------
                 * BUSINESS COMPARISON TABLE
                 * ------------------------------------------------
                 */
                table({ children }) {
                  return (
                    <div className="my-5 w-full overflow-x-auto rounded-lg border border-border">
                      <table className="m-0 w-full min-w-[620px]">
                        {children}
                      </table>
                    </div>
                  );
                },

                /*
                 * ------------------------------------------------
                 * REPORT MAIN TITLE
                 * ------------------------------------------------
                 */
                h1({ children }) {
                  return (
                    <h1 className="mb-5 mt-0 border-b border-border pb-3 text-2xl font-semibold tracking-tight text-text-primary">
                      {children}
                    </h1>
                  );
                },

                /*
                 * ------------------------------------------------
                 * REPORT SECTION
                 * ------------------------------------------------
                 */
                h2({ children }) {
                  return (
                    <h2 className="mb-3 mt-9 text-xl font-semibold tracking-tight text-text-primary">
                      {children}
                    </h2>
                  );
                },

                /*
                 * ------------------------------------------------
                 * REPORT SUBSECTION
                 * ------------------------------------------------
                 */
                h3({ children }) {
                  return (
                    <h3 className="mb-2 mt-6 text-base font-semibold text-text-primary">
                      {children}
                    </h3>
                  );
                },

                /*
                 * ------------------------------------------------
                 * HORIZONTAL RULE
                 * ------------------------------------------------
                 */
                hr() {
                  return (
                    <div className="my-7 border-t border-border" />
                  );
                },

                /*
                 * ------------------------------------------------
                 * BUSINESS REPORT SOURCE LIST
                 * ------------------------------------------------
                 */
                ul({ children }) {
                  return (
                    <ul className="my-4 space-y-1.5 pl-5">
                      {children}
                    </ul>
                  );
                },

                /*
                 * ------------------------------------------------
                 * REPORT PARAGRAPH
                 * ------------------------------------------------
                 */
                p({ children }) {
                  return (
                    <p className="my-3 leading-7 text-text-secondary">
                      {children}
                    </p>
                  );
                },
              }}
            >
              {cleanReport}
            </ReactMarkdown>
          </article>
        </div>

        {/* ===================================================
            REPORT FOOTER
            =================================================== */}
        <div className="border-t border-border px-6 py-4 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">

            <span>
              Generated by the Agentic AI Business Research System
            </span>

            {approved === true && (
              <span className="flex items-center gap-1.5 text-success">
                <Check size={13} />
                Reviewed and approved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}