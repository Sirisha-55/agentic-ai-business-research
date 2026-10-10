import type {
  AgentKey,
  Analysis,
  PlanTask,
  ResearchFinding,
  Review,
  RunEvent,
  Source,
} from "./types";

/* =========================================================
   LATEST COMPLETED EVENT DATA
========================================================= */

function latestData(
  events: RunEvent[],
  agent: AgentKey,
): Record<string, unknown> | null {
  const relevant = events.filter(
    (event) =>
      event.agent === agent &&
      event.status === "completed" &&
      event.data,
  );

  if (relevant.length === 0) {
    return null;
  }

  return (
    relevant[relevant.length - 1].data ?? null
  );
}

/* =========================================================
   PLAN
========================================================= */

export function derivePlan(
  events: RunEvent[],
): PlanTask[] {
  const data = latestData(
    events,
    "planner",
  );

  return (
    (data?.tasks as PlanTask[]) ??
    []
  );
}

/* =========================================================
   RESEARCH
 *
 * Research is now handled by three agents:
 *
 * Market
 * Company
 * Competitor
 *
 * Combine findings and sources from all
 * three completed research agents.
========================================================= */

export function deriveResearch(
  events: RunEvent[],
): {
  findings: ResearchFinding[];
  sources: Source[];
} {
  const researchAgents: AgentKey[] = [
    "market",
    "company",
    "competitor",
  ];

  const findings: ResearchFinding[] = [];
  const sources: Source[] = [];

  for (const agent of researchAgents) {
    const data = latestData(
      events,
      agent,
    );

    if (!data) {
      continue;
    }

    const agentFindings =
      (data.findings as ResearchFinding[]) ??
      [];

    const agentSources =
      (data.sources as Source[]) ??
      [];

    findings.push(
      ...agentFindings,
    );

    sources.push(
      ...agentSources,
    );
  }

  /*
   * Remove duplicate sources when
   * multiple research agents return
   * the same URL.
   */
  const uniqueSources =
    Array.from(
      new Map(
        sources.map((source) => [
          source.url ??
            source.title ??
            JSON.stringify(source),
          source,
        ]),
      ).values(),
    );

  return {
    findings,
    sources: uniqueSources,
  };
}

/* =========================================================
   ANALYSIS
========================================================= */

export function deriveAnalysis(
  events: RunEvent[],
): Analysis | null {
  const data = latestData(
    events,
    "analysis",
  );

  return (
    (data?.analysis as Analysis) ??
    null
  );
}

/* =========================================================
   WRITER DRAFT
========================================================= */

export function deriveDraft(
  events: RunEvent[],
): string | null {
  const data = latestData(
    events,
    "writer",
  );

  return (
    (data?.draft as string) ??
    null
  );
}

/* =========================================================
   FIRST WRITER DRAFT
========================================================= */

export function deriveDraftFirst(
  events: RunEvent[],
): string | null {
  return deriveDraft(events);
}

/* =========================================================
   WRITER REVISION
 *
 * Kept only for compatibility with
 * existing UI code.
 *
 * New workflow has no separate
 * writer_revision agent.
========================================================= */

export function deriveDraftRevision(
  _events: RunEvent[],
): string | null {
  return null;
}

/* =========================================================
   REVIEW
========================================================= */

export function deriveReview(
  events: RunEvent[],
): Review | null {
  const data = latestData(
    events,
    "reviewer",
  );

  return (
    (data?.review as Review) ??
    null
  );
}

/* =========================================================
   FIRST REVIEW
========================================================= */

export function deriveReviewFirst(
  events: RunEvent[],
): Review | null {
  return deriveReview(events);
}

/* =========================================================
   REVIEW REVISION
 *
 * Kept only for compatibility with
 * existing UI code.
 *
 * New workflow has no separate
 * reviewer_revision agent.
========================================================= */

export function deriveReviewRevision(
  _events: RunEvent[],
): Review | null {
  return null;
}

/* =========================================================
   LATEST REVIEW EVENT
 *
 * Only the Reviewer agent exists in the
 * new workflow.
========================================================= */

function latestReviewEvent(
  events: RunEvent[],
): RunEvent | null {
  const relevant =
    events.filter(
      (event) =>
        event.agent === "reviewer" &&
        event.status === "completed" &&
        event.data,
    );

  return relevant.length
    ? relevant[relevant.length - 1]
    : null;
}

/* =========================================================
   FINAL REPORT
 *
 * Final report is exposed only when:
 *
 * 1. Reviewer completed
 * 2. Reviewer approved
 * 3. Writer produced a draft
========================================================= */

export function deriveFinalReport(
  events: RunEvent[],
): string | null {
  const reviewEvent =
    latestReviewEvent(events);

  if (!reviewEvent) {
    return null;
  }

  const review =
    reviewEvent.data
      ?.review as Review | undefined;

  if (!review?.approved) {
    return null;
  }

  return deriveDraft(events);
}

/* =========================================================
   REVISION PENDING
 *
 * New workflow does not contain a
 * separate revision agent.
 *
 * Therefore this is always false.
 *
 * Kept for compatibility with
 * existing components.
========================================================= */

export function deriveRevisionPending(
  _events: RunEvent[],
): boolean {
  return false;
}

/* =========================================================
   NEVER APPROVED
 *
 * True when the Reviewer has completed
 * and rejected the report.
 *
 * There is no second revision/reviewer
 * pass in the new workflow.
========================================================= */

export function deriveNeverApproved(
  events: RunEvent[],
): boolean {
  const latest =
    latestReviewEvent(events);

  if (!latest) {
    return false;
  }

  const review =
    latest.data
      ?.review as Review | undefined;

  return !!review &&
    review.approved === false;
}