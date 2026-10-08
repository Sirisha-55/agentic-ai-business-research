import {
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Building2,
  History,
  ListTodo,
  Loader2,
  PenLine,
  Search,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from "lucide-react";

import type {
  AgentKey,
  RunEvent,
} from "../types";

import EmptyState from "./EmptyState";

const AGENT_META: Record<
  AgentKey,
  {
    label: string;
    icon: LucideIcon;
  }
> = {
  system: {
    label: "System",
    icon: History,
  },

  planner: {
    label: "Planner Agent",
    icon: ListTodo,
  },

  market: {
    label: "Market Agent",
    icon: Search,
  },

  company: {
    label: "Company Agent",
    icon: Building2,
  },

  competitor: {
    label: "Competitor Agent",
    icon: Swords,
  },

  analysis: {
    label: "Analysis Agent",
    icon: BrainCircuit,
  },

  writer: {
    label: "Writer Agent",
    icon: PenLine,
  },

  reviewer: {
    label: "Reviewer Agent",
    icon: ShieldCheck,
  },

  final_report: {
    label: "Final Report Agent",
    icon: BarChart3,
  },
};

function formatTime(
  iso: string,
): string {
  return new Date(
    iso,
  ).toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    },
  );
}

export default function AgentTimeline({
  events,
}: {
  events: RunEvent[];
}) {
  const relevant =
    events.filter(
      (event) =>
        event.status ===
          "completed" ||
        event.status ===
          "failed" ||
        event.status ===
          "running",
    );

  if (relevant.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Timeline events will appear here as business research agents start working."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <ol className="space-y-0">
        {relevant.map(
          (event, idx) => {
            const meta =
              AGENT_META[
                event.agent
              ] ??
              AGENT_META.system;

            const Icon =
              meta.icon;

            const isLast =
              idx ===
              relevant.length - 1;

            return (
              <li
                key={event.id}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {!isLast && (
                  <span
                    className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-border"
                    aria-hidden
                  />
                )}

                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    event.status ===
                    "failed"
                      ? "bg-error/10 text-error"
                      : event.status ===
                        "running"
                        ? "bg-accent/10 text-accent"
                        : "bg-success/10 text-success"
                  }`}
                >
                  {event.status ===
                  "failed" ? (
                    <AlertCircle
                      size={14}
                    />
                  ) : event.status ===
                    "running" ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Icon
                      size={14}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <p className="text-sm font-medium text-text-primary">
                      {meta.label}
                    </p>

                    <span className="text-[11px] text-text-muted">
                      {formatTime(
                        event.timestamp,
                      )}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-text-secondary">
                    {event.message}
                  </p>
                </div>
              </li>
            );
          },
        )}
      </ol>
    </div>
  );
}