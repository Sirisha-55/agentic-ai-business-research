import type { PlanTask } from "../types";

export default function PlanView({ plan }: { plan: PlanTask[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">
          Execution plan
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          {plan.length} research {plan.length === 1 ? "subtask" : "subtasks"}
        </p>
      </div>

      {plan.length === 0 ? (
        <p className="text-sm text-text-muted">
          The Planner has not generated any tasks yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {plan.map((task, index) => (
            <article
              key={`${task.id ?? index}-${task.title}`}
              className="flex gap-3 rounded-lg border border-border bg-surface-2/40 p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-semibold text-accent">
                <span aria-hidden="true">☷</span>
              </span>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-text-primary">
                  {task.title || `Research task ${index + 1}`}
                </h4>
                {task.description ? (
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    {task.description}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
