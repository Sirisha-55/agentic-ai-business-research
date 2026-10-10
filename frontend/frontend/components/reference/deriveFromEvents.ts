import type {
  AgentKey,
  Analysis,
  PlanTask,
  ResearchFinding,
  Review,
  RunEvent,
  Source,
} from "./types";

function latestData(
  events: RunEvent[],
  agent: AgentKey,
): Record<string, unknown> | null {
  const outputKeys: Partial<Record<AgentKey, string[]>> = {
    planner: ["tasks", "research_plan", "plan"],
    market: ["market_research", "findings", "research_findings", "results"],
    company: ["company_research", "findings", "research_findings", "results"],
    competitor: ["competitor_research", "findings", "research_findings", "results"],
    analysis: ["analysis", "output", "content", "text"],
    writer: ["draft", "content", "text", "output"],
    reviewer: ["review", "review_result", "output", "content", "text"],
    final_report: ["final_report", "report", "content", "text", "output"],
  };
  const relevant = events.filter((event) => event.agent === agent && event.data);

  // Streamed completion events carry the result directly. Some API adapters
  // wrap it under `data` or `result`, and may normalize the event status
  // differently, so select by the actual output payload as well as status.
  let latestCompleted: Record<string, unknown> | null = null;
  for (let index = relevant.length - 1; index >= 0; index -= 1) {
    const data = relevant[index].data!;
    const nested = toRecord(data.data) ?? toRecord(data.result);
    const keys = outputKeys[agent] ?? [];
    const hasOutput = keys.some(
      (key) => data[key] != null || nested?.[key] != null,
    );
    if (hasOutput) return data;
    if (!latestCompleted && relevant[index].status === "completed") {
      latestCompleted = nested ?? data;
    }
  }

  return latestCompleted;
}

function getArray(
  data: Record<string, unknown> | null,
  keys: string[],
): unknown[] {
  if (!data) return [];

  for (const key of keys) {
    const value = data[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  // Also support API events that wrap the agent result.
  const result = data.result;

  if (Array.isArray(result)) {
    return result;
  }

  const nestedData = toRecord(data.data);
  if (nestedData) {
    for (const key of keys) {
      const value = nestedData[key];
      if (Array.isArray(value)) return value;
    }
  }

  if (typeof result === "object" && result !== null) {
    for (const key of keys) {
      const value = (result as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

function getValue(
  data: Record<string, unknown> | null,
  keys: string[],
): unknown {
  if (!data) return null;

  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }

  const nestedData = toRecord(data.data);
  if (nestedData) {
    for (const key of keys) {
      if (nestedData[key] !== undefined && nestedData[key] !== null) {
        return nestedData[key];
      }
    }
  }

  const result = data.result;

  if (typeof result === "object" && result !== null) {
    const resultObject = result as Record<string, unknown>;

    for (const key of keys) {
      if (
        resultObject[key] !== undefined &&
        resultObject[key] !== null
      ) {
        return resultObject[key];
      }
    }
  }

  // Some provider adapters place the completed agent payload under a
  // generic output/content field rather than the agent-specific key.
  for (const key of ["output", "content", "text"]) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }

  return result ?? null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function toFindings(
  values: unknown[],
  agent: "market" | "company" | "competitor",
): ResearchFinding[] {
  return values.map((value, index) => {
    const item = toRecord(value) ?? {};
    const sourceUrls = Array.isArray(item.source_urls)
      ? item.source_urls.map(String)
      : typeof item.url === "string" && item.url
        ? [item.url]
        : [];

    const points = Array.isArray(item.key_points)
      ? item.key_points.map(String)
      : Array.isArray(item.findings)
        ? item.findings.map(String)
        : [];

    const summary = String(
      item.summary ??
        item.content ??
        item.snippet ??
        item.description ??
        "",
    );

    return {
      task_id: Number(item.task_id ?? index + 1),
      task_title: String(
        item.task_title ??
          item.title ??
          `${agent} research`,
      ),
      summary,
      key_points: points,
      source_urls: sourceUrls,
    };
  });
}

function toSources(values: unknown[]): Source[] {
  const sources: Source[] = [];

  const addSource = (value: unknown) => {
    const item = toRecord(value);
    if (!item) return;

    const url = item.url ?? item.source_url;

    if (typeof url !== "string" || !url) return;

    sources.push({
      url,
      title: String(item.title ?? item.name ?? url),
      snippet: String(
        item.snippet ?? item.content ?? item.description ?? "",
      ),
    });
  };

  values.forEach(addSource);

  return Array.from(
    new Map(sources.map((source) => [source.url, source])).values(),
  );
}

export function derivePlan(events: RunEvent[]): PlanTask[] {
  const data = latestData(events, "planner");
  const tasks = getArray(data, [
    "tasks",
    "research_plan",
    "plan",
  ]);

  return tasks.map((value, index) => {
    const item = toRecord(value);

    if (!item) {
      return {
        id: index + 1,
        title: `Research task ${index + 1}`,
        description: String(value),
      };
    }

    return {
      id: Number(item.id ?? item.task_id ?? index + 1),
      title: String(
        item.title ?? item.task_title ?? item.name ?? `Task ${index + 1}`,
      ),
      description: String(
        item.description ?? item.summary ?? item.query ?? "",
      ),
      ...(item.researcher === "market" ||
      item.researcher === "company" ||
      item.researcher === "competitor"
        ? { researcher: item.researcher }
        : {}),
    };
  });
}

export function deriveResearchByAgent(
  events: RunEvent[],
  agent: "market" | "company" | "competitor",
): { findings: ResearchFinding[]; sources: Source[] } {
  const data = latestData(events, agent);

  if (!data) {
    return { findings: [], sources: [] };
  }

  const resultKeys = {
    market: ["market_research", "findings", "research_findings", "results"],
    company: ["company_research", "findings", "research_findings", "results"],
    competitor: [
      "competitor_research",
      "findings",
      "research_findings",
      "results",
    ],
  }[agent];

  const finalResults = getArray(data, resultKeys);
  const streamedResults = events
    .filter(
      (event) =>
        event.agent === agent &&
        event.status === "completed" &&
        event.data,
    )
    .flatMap((event) => getArray(event.data, ["task_results"]));
  const raw = finalResults.length > 0 ? finalResults : streamedResults;
  const orderedRaw = raw
    .map((value, index) => ({ value, index, item: toRecord(value) }))
    .sort((left, right) => {
      const leftOrder = Number(
        left.item?.planner_task_index ?? left.item?.task_id ?? left.index + 1,
      );
      const rightOrder = Number(
        right.item?.planner_task_index ?? right.item?.task_id ?? right.index + 1,
      );
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ value }) => value);
  const rawSources = getArray(data, ["sources"]);

  const findings = toFindings(orderedRaw, agent);
  const sources = toSources([
    ...rawSources,
    ...orderedRaw,
  ]);

  // Some agent results contain source URLs without separate source objects.
  for (const finding of findings) {
    for (const url of finding.source_urls) {
      if (!sources.some((source) => source.url === url)) {
        sources.push({
          url,
          title: url,
          snippet: "",
        });
      }
    }
  }

  return {
    findings,
    sources: Array.from(
      new Map(sources.map((source) => [source.url, source])).values(),
    ),
  };
}

export function deriveResearch(
  events: RunEvent[],
): { findings: ResearchFinding[]; sources: Source[] } {
  const agents = ["market", "company", "competitor"] as const;
  const findings: ResearchFinding[] = [];
  const sources: Source[] = [];

  for (const agent of agents) {
    const result = deriveResearchByAgent(events, agent);
    findings.push(...result.findings);
    sources.push(...result.sources);
  }

  return {
    findings,
    sources: Array.from(
      new Map(
        sources.map((source) => [
          source.url || source.title || JSON.stringify(source),
          source,
        ]),
      ).values(),
    ),
  };
}

export function deriveAnalysis(
  events: RunEvent[],
): Analysis | string | null {
  const data = latestData(events, "analysis");

  const analysis = getValue(data, [
    "analysis",
    "analysis_result",
    "business_analysis",
    "insights",
  ]);
  if ((typeof analysis === "string" && analysis.trim()) || toRecord(analysis)) {
    return analysis as Analysis | string;
  }

  // Keep a completed stage informative even when a legacy event only stored
  // its completion summary instead of the generated analysis payload.
  const completed = [...events].reverse().find(
    (event) => event.agent === "analysis" && event.status === "completed",
  );
  return completed?.message || null;
}

export function deriveDraft(events: RunEvent[]): string | null {
  const data = latestData(events, "writer");
  const draft = getValue(data, ["draft", "content", "text"]);

  if (typeof draft === "string") return draft;

  if (typeof draft === "object" && draft !== null) {
    const item = draft as Record<string, unknown>;
    const text = item.content ?? item.text ?? item.draft;

    return typeof text === "string" ? text : null;
  }

  return null;
}

export function deriveDraftFirst(events: RunEvent[]): string | null {
  return deriveDraft(events);
}

export function deriveDraftRevision(_events: RunEvent[]): string | null {
  return null;
}

export function deriveReview(events: RunEvent[]): Review | string | null {
  const data = latestData(events, "reviewer");
  const review = getValue(data, ["review", "review_result"]);

  if (typeof review === "string" && review.trim()) {
    return review;
  }

  if (typeof review === "object" && review !== null) {
    return review as Review;
  }

  return null;
}

export function deriveReviewFirst(events: RunEvent[]): Review | string | null {
  return deriveReview(events);
}

export function deriveReviewRevision(_events: RunEvent[]): Review | null {
  return null;
}

function latestReviewEvent(events: RunEvent[]): RunEvent | null {
  const relevant = events.filter(
    (event) =>
      event.agent === "reviewer" &&
      event.status === "completed" &&
      event.data,
  );

  return relevant.length
    ? relevant[relevant.length - 1]
    : null;
}

export function deriveFinalReport(events: RunEvent[]): string | null {
  const data = latestData(events, "final_report");

  const finalReport = getValue(data, [
    "final_report",
    "report",
    "content",
    "text",
  ]);

  if (typeof finalReport === "string" && finalReport.trim()) {
    return finalReport;
  }

  const reviewEvent = latestReviewEvent(events);
  if (!reviewEvent) return deriveDraft(events);

  const review = getValue(reviewEvent.data, ["review"]);

  if (
    (typeof review === "string" && /NEEDS_REVISION/i.test(review)) ||
    (toRecord(review)?.approved === false)
  ) {
    return null;
  }

  return deriveDraft(events);
}

export function deriveRevisionPending(_events: RunEvent[]): boolean {
  return false;
}

export function deriveNeverApproved(events: RunEvent[]): boolean {
  const latest = latestReviewEvent(events);
  if (!latest) return false;

  const review = getValue(latest.data, ["review"]);

  return typeof review === "string"
    ? /NEEDS_REVISION/i.test(review)
    : toRecord(review)?.approved === false;
}
