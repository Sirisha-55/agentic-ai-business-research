import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

import Button from "../components/Button";

export default function NewResearchPage({
  onSubmit,
}: {
  onSubmit: (objective: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /*
   * Business Research examples
   */
  const examples = [
    "Analyze the Indian electric vehicle market and identify the major competitors of Tata Motors.",
    "Compare Amazon, Flipkart, and Reliance Retail based on market position, business strategy, competitors, and future opportunities.",
    "Analyze the Indian fintech market, identify major companies, recent trends, challenges, and potential business opportunities.",
  ];

  const hasQuery =
    query.trim().length > 0;

  async function handleSubmit() {
    const objective =
      query.trim();

    if (
      !objective ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const success =
        await onSubmit(
          objective,
        );

      if (success) {
        setQuery("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function useExample(
    example: string,
  ) {
    setQuery(example);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* =====================================================
          PAGE HEADING
          Same reference format
          ===================================================== */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-primary">
          Start a Research Task
        </h1>

        <p className="mt-2 text-sm leading-6 text-text-secondary sm:text-base">
          Enter a research objective and let the agent workflow handle planning, research, analysis, writing, and review.
        </p>
      </div>

      {/* =====================================================
          RESEARCH INPUT CARD
          Same reference colors and format
          ===================================================== */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Sparkles size={16} />
          </div>

          <textarea
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            onKeyDown={
              handleKeyDown
            }
            rows={3}
            placeholder="Example: Analyze the latest developments in Generative AI and prepare a structured report covering key trends, companies, challenges, and future opportunities."
            aria-label="Research objective"
            className="min-h-[92px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-text-primary outline-none placeholder:text-text-secondary focus:ring-0 sm:text-base"
            disabled={submitting}
          />
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-text-secondary">
              Enter to run · Shift+Enter for a new line
            </span>

            <Button
              size="sm"
              onClick={
                handleSubmit
              }
              disabled={
                !hasQuery ||
                submitting
              }
            >
              {submitting
                ? "Starting..."
                : "Run Research"}

              <ArrowRight
                size={15}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* =====================================================
          EXAMPLES
          Same reference format
          ===================================================== */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Try an example
        </p>

        <div className="flex flex-col gap-2">
          {examples.map(
            (example) => (
              <button
                key={example}
                type="button"
                onClick={() =>
                  useExample(
                    example,
                  )
                }
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-left text-sm leading-5 text-text-primary transition hover:border-accent/40 hover:bg-surface-2"
              >
                {example}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
