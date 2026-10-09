import type {

  AgentKey,

  Analysis,

  PlanTask,

  ResearchFinding,

  Review,

  RunEvent,

  Source,

} from "./types";



/*

 * This file derives UI data from the run's persisted events.

 *

 * Important:

 * - Real task progress requires the backend to emit task-level events.

 * - This file does not invent Running or Completed statuses.

 * - Existing Planner, Research, Analyzer, Writer, and Reviewer agents remain unchanged.

 */



type EventData = Record<string, unknown>;



type TaskStatus = "waiting" | "running" | "completed" | "failed";



type PlanTaskWithProgress = Omit<PlanTask, "title" | "description" | "status" | "task_status" | "taskStatus"> & {

  taskKey: string;

  title: string;

  description?: string;

  status?: TaskStatus;

  task_status?: TaskStatus;

  taskStatus?: TaskStatus;

};



function asRecord(value: unknown): EventData | null {

  return value !== null && typeof value === "object" && !Array.isArray(value)

    ? (value as EventData)

    : null;

}



function getEventData(event: RunEvent): EventData | null {

  return asRecord(event.data);

}



/* =========================================================

   EVENT HELPERS

\========================================================= */



function completedEvents(

  events: RunEvent[],

  agent: AgentKey,

): RunEvent[] {

  return events.filter(

    (event) =>

      event.agent === agent &&

      event.status === "completed" &&

      Boolean(event.data),

  );

}



function latestCompletedEvent(

  events: RunEvent[],

  agent: AgentKey,

): RunEvent | null {

  const relevant = completedEvents(events, agent);

  return relevant.length > 0 ? relevant[relevant.length - 1] : null;

}



function latestData(

  events: RunEvent[],

  agent: AgentKey,

): EventData | null {

  const event = latestCompletedEvent(events, agent);

  return event ? getEventData(event) : null;

}



function firstData(

  events: RunEvent[],

  agent: AgentKey,

): EventData | null {

  const event = completedEvents(events, agent)[0];

  return event ? getEventData(event) : null;

}



function asArray<T>(value: unknown): T[] {

  return Array.isArray(value) ? (value as T[]) : [];

}



function nonEmptyString(value: unknown): string | null {

  return typeof value === "string" && value.trim().length > 0

    ? value.trim()

    : null;

}



/* =========================================================

   PLAN + TASK PROGRESS

\========================================================= */



function normalizeTask(

  value: unknown,

  index: number,

): PlanTaskWithProgress | null {

  const task = asRecord(value);

  if (!task) return null;



  const id =

    nonEmptyString(task.id) ??

    nonEmptyString(task.task_id) ??

    nonEmptyString(task.taskId) ??

    `task_${index + 1}`;



  const title =

    nonEmptyString(task.title) ??

    nonEmptyString(task.name) ??

    nonEmptyString(task.task) ??

    nonEmptyString(task.description) ??

    `Research task ${index + 1}`;



  const description =

    nonEmptyString(task.description) ??

    nonEmptyString(task.details) ??

    nonEmptyString(task.objective) ??

    undefined;



  const rawStatus =

    nonEmptyString(task.task_status) ??

    nonEmptyString(task.taskStatus) ??

    nonEmptyString(task.status);



  const normalizedStatus = normalizeTaskStatus(rawStatus);



  return ({

    ...(task as unknown as PlanTask),

    taskKey: id,

    title,

    ...(description ? { description } : {}),

    ...(normalizedStatus

      ? {

          status: normalizedStatus,

          task_status: normalizedStatus,

          taskStatus: normalizedStatus,

        }

      : {}),

  } as unknown as PlanTaskWithProgress);

}



function normalizeTaskStatus(value: string | null): TaskStatus | undefined {

  if (!value) return undefined;



  const status = value.toLowerCase().replace(/[\s-]+/g, "_");



  if (["waiting", "pending", "queued", "not_started"].includes(status)) {

    return "waiting";

  }

  if (["running", "in_progress", "started"].includes(status)) {

    return "running";

  }

  if (["completed", "complete", "done", "success", "succeeded"].includes(status)) {

    return "completed";

  }

  if (["failed", "error"].includes(status)) {

    return "failed";

  }



  return undefined;

}



function taskIdFromEvent(event: RunEvent, data: EventData): string | null {

  return (

    nonEmptyString(data.task_id) ??

    nonEmptyString(data.taskId) ??

    nonEmptyString(data.id) ??

    null

  );

}



function taskStatusFromEvent(

  event: RunEvent,

  data: EventData,

): TaskStatus | undefined {

  const explicit =

    nonEmptyString(data.task_status) ??

    nonEmptyString(data.taskStatus) ??

    nonEmptyString(data.status);



  const normalized = normalizeTaskStatus(explicit);

  if (normalized) return normalized;



  /*

   * Some backends put the task status in the event's top-level status.

   * Only use it for events that identify a task.

   */

  if (taskIdFromEvent(event, data)) {

    return normalizeTaskStatus(String(event.status));

  }



  return undefined;

}



function statusRank(status: TaskStatus): number {

  switch (status) {

    case "waiting":

      return 0;

    case "running":

      return 1;

    case "completed":

      return 2;

    case "failed":

      return 3;

  }

}



export function derivePlan(events: RunEvent[]): PlanTask[] {

  /*

   * The Planner completion event is expected to contain:

   * data.tasks = [{ id/task_id, title, description, ... }]

   *

   * We fall back to any Planner event carrying tasks so the plan can

   * appear even if a backend uses a different event status convention.

   */

  const plannerEvents = events.filter((event) => event.agent === "planner");



  let rawTasks: unknown[] = [];

  for (let i = plannerEvents.length - 1; i >= 0; i -= 1) {

    const data = getEventData(plannerEvents[i]);

    if (!data) continue;



    const tasks = asArray<unknown>(data.tasks ?? data.research_plan ?? data.plan);

    if (tasks.length > 0) {

      rawTasks = tasks;

      break;

    }

  }



  const normalized = rawTasks

    .map((task, index) => normalizeTask(task, index))

    .filter((task): task is PlanTaskWithProgress => task !== null);



  /*

   * Apply the most recent actual task-status event for each task.

   * Supports events whose task details are stored directly in data,

   * or nested under data.task.

   */

  const latestTaskStatus = new Map<string, TaskStatus>();



  for (const event of events) {

    const data = getEventData(event);

    if (!data) continue;



    const nestedTask = asRecord(data.task);

    const taskData = nestedTask ?? data;

    const taskId = taskIdFromEvent(event, taskData);

    const taskStatus = taskStatusFromEvent(event, taskData);



    if (taskId && taskStatus) {

      latestTaskStatus.set(taskId, taskStatus);

    }

  }



  return normalized.map((task, index) => {

    const eventStatus = latestTaskStatus.get(task.taskKey);

    const status = eventStatus ?? task.status;



    /*

     * Defaulting a task to Waiting is a display default, not a claim

     * that the backend reported progress. Real Running/Completed states

     * are applied only when present in task data or events.

     */

    const displayStatus = status ?? "waiting";



    const { taskKey, ...planTask } = task;

    return {

      ...planTask,

      id: typeof planTask.id === "number" ? planTask.id : index + 1,

      status: displayStatus,

      task_status: displayStatus,

      taskStatus: displayStatus,

    } as PlanTask;

  });

}



/* =========================================================

   RESEARCH

 *

 * Combine findings and sources from the three research agents.

\========================================================= */



export function deriveResearch(

  events: RunEvent[],

): {

  findings: ResearchFinding[];

  sources: Source[];

} {

  const researchAgents: AgentKey[] = ["market", "company", "competitor"];



  const findings: ResearchFinding[] = [];

  const sources: Source[] = [];



  for (const agent of researchAgents) {

    const data = latestData(events, agent);

    if (!data) continue;



    findings.push(...asArray<ResearchFinding>(data.findings));

    sources.push(...asArray<Source>(data.sources));

  }



  const uniqueSources = Array.from(
    new Map<string, Source>(
      sources.map(
        (source): [string, Source] => [
          String(source.url ?? source.title ?? JSON.stringify(source)),
          source,
        ],
      ),
    ).values(),
  );

  return { findings, sources: uniqueSources };

}



/* =========================================================

   ANALYSIS

\========================================================= */



export function deriveAnalysis(events: RunEvent[]): Analysis | null {

  const data = latestData(events, "analysis");

  return (data?.analysis as Analysis | undefined) ?? null;

}



/* =========================================================

   WRITER DRAFT

\========================================================= */



export function deriveDraft(events: RunEvent[]): string | null {

  const data = latestData(events, "writer");

  return (data?.draft as string | undefined) ?? null;

}



/* =========================================================

   FIRST WRITER DRAFT

\========================================================= */



export function deriveDraftFirst(events: RunEvent[]): string | null {

  const data = firstData(events, "writer");

  return (data?.draft as string | undefined) ?? null;

}



/* =========================================================

   WRITER REVISION

 *

 * No separate writer_revision agent is required. The latest completed

 * Writer event is compared with the first completed Writer event.

\========================================================= */



export function deriveDraftRevision(events: RunEvent[]): string | null {

  const first = deriveDraftFirst(events);

  const latest = deriveDraft(events);



  if (!first || !latest || first === latest) return null;

  return latest;

}



/* =========================================================

   REVIEW

\========================================================= */



export function deriveReview(events: RunEvent[]): Review | null {

  const data = latestData(events, "reviewer");

  return (data?.review as Review | undefined) ?? null;

}



/* =========================================================

   FIRST REVIEW

\========================================================= */



export function deriveReviewFirst(events: RunEvent[]): Review | null {

  const data = firstData(events, "reviewer");

  return (data?.review as Review | undefined) ?? null;

}



/* =========================================================

   REVIEW REVISION

\========================================================= */



export function deriveReviewRevision(events: RunEvent[]): Review | null {

  const first = deriveReviewFirst(events);

  const latest = deriveReview(events);



  if (!first || !latest || JSON.stringify(first) === JSON.stringify(latest)) {

    return null;

  }



  return latest;

}



/* =========================================================

   LATEST REVIEW EVENT

\========================================================= */



function latestReviewEvent(events: RunEvent[]): RunEvent | null {

  const relevant = completedEvents(events, "reviewer");

  return relevant.length > 0 ? relevant[relevant.length - 1] : null;

}



/* =========================================================

   FINAL REPORT

 *

 * Exposed only when the latest Reviewer event approves the latest

 * Writer draft.

\========================================================= */



export function deriveFinalReport(events: RunEvent[]): string | null {

  const reviewEvent = latestReviewEvent(events);

  if (!reviewEvent) return null;



  const review = getEventData(reviewEvent)?.review as Review | undefined;

  if (!review?.approved) return null;



  return deriveDraft(events);

}



/* =========================================================

   REVISION PENDING

 *

 * True when the latest review rejects the draft and another completed

 * Writer draft has not yet appeared after that review.

\========================================================= */



export function deriveRevisionPending(events: RunEvent[]): boolean {

  const reviewEvent = latestReviewEvent(events);

  if (!reviewEvent) return false;



  const review = getEventData(reviewEvent)?.review as Review | undefined;

  if (!review || review.approved !== false) return false;



  const writerEvents = completedEvents(events, "writer");

  const latestWriterEvent = writerEvents[writerEvents.length - 1];



  if (!latestWriterEvent) return true;



  const reviewIndex = events.indexOf(reviewEvent);

  const writerIndex = events.indexOf(latestWriterEvent);



  return reviewIndex > writerIndex;

}



/* =========================================================

   NEVER APPROVED

 *

 * True when the latest completed Reviewer event explicitly rejects

 * the report and no subsequent Writer draft has been completed.

\========================================================= */



export function deriveNeverApproved(events: RunEvent[]): boolean {

  const latest = latestReviewEvent(events);

  if (!latest) return false;



  const review = getEventData(latest)?.review as Review | undefined;

  if (!review || review.approved !== false) return false;



  const latestWriter = latestCompletedEvent(events, "writer");

  if (!latestWriter) return true;



  return events.indexOf(latest) > events.indexOf(latestWriter);

}
