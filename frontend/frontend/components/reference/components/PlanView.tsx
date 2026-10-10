import { CheckCircle2, CircleDashed, ListTodo, Loader2 } from "lucide-react";
import type { PlanTask, RunEvent } from "../types";
import Section from "./Section";
import LinkedText from "./LinkedText";

export default function PlanView({
  plan,
  events,
}: {
  plan: PlanTask[];
  events: RunEvent[];
}) {
  if (plan.length === 0) {
    return (
      <Section title="Execution plan">
        <p className="text-sm text-text-muted">The Planner Agent is preparing the execution plan.</p>
      </Section>
    );
  }
  return (
    <Section title="Execution plan" subtitle={`${plan.length} research subtasks`}>
      <ol className="space-y-2">
        {plan.map((task, index) => {
          const taskEvent = [...events].reverse().find((event) =>
            (event.agent === task.researcher || ["market", "company", "competitor"].includes(event.agent)) &&
            Number(event.data?.task_id) === task.id,
          );
          const researcher = task.researcher ?? taskEvent?.agent;
          const researcherName = researcher
            ? `${researcher.charAt(0).toUpperCase()}${researcher.slice(1)} Agent`
            : "Research agent pending assignment";
          const TaskStatusIcon = taskEvent?.status === "completed"
            ? CheckCircle2
            : taskEvent?.status === "running"
              ? Loader2
              : CircleDashed;
          const taskStatus = taskEvent?.status === "completed"
            ? "Completed"
            : taskEvent?.status === "running"
              ? "In progress"
              : "Queued";

          return (
          <li
            key={task.id}
            className="flex gap-3 rounded-lg border border-border bg-surface-2/50 p-3 sm:p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <ListTodo size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-text-primary">
                  <span className="mr-1.5 text-text-muted">{index + 1}.</span>
                  {task.title}
                </p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">
                  {researcherName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                  <TaskStatusIcon size={12} className={taskEvent?.status === "running" ? "animate-spin" : ""} />
                  {taskStatus}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary"><LinkedText>{task.description}</LinkedText></p>
            </div>
          </li>
          );
        })}
      </ol>
    </Section>
  );
}
