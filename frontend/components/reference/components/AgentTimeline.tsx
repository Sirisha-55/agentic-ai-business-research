import {
  AlertCircle,
  BrainCircuit,
  History,
  ListTodo,
  Loader2,
  PenLine,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AgentKey, RunEvent } from "../types";
import EmptyState from "./EmptyState";

const AGENT_META: Record<AgentKey, { label: string; icon: LucideIcon }> = {
  system: { label: "System", icon: History },
  planner: { label: "Planner Agent", icon: ListTodo },
  researcher: { label: "Market / Company / Competitor Agents", icon: Search },
  analyst: { label: "Analysis Agent", icon: BrainCircuit },
  writer: { label: "Writer Agent", icon: PenLine },
  writer_revision: { label: "Writer Agent", icon: PenLine },
  reviewer: { label: "Reviewer Agent", icon: ShieldCheck },
  reviewer_revision: { label: "Reviewer Agent", icon: ShieldCheck },
};

function activityMessage(event: RunEvent): string {
  if (event.message?.trim()) return event.message;

  if (event.agent === "planner") {
    return event.status === "running"
      ? "Understanding the business objective and creating the research plan..."
      : "Created focused research subtasks for market, company and competitor analysis.";
  }

  if (event.agent === "researcher") {
    return event.status === "running"
      ? "Market Agent, Company Agent and Competitor Agent are collecting relevant business evidence..."
      : "Market, company and competitor research findings have been collected for analysis.";
  }

  if (event.agent === "analyst") {
    return event.status === "running"
      ? "Analyzing market, company and competitor findings for trends, risks and opportunities..."
      : "Synthesized the collected evidence into business insights.";
  }

  if (event.agent === "writer" || event.agent === "writer_revision") {
    return event.status === "running"
      ? "Writing the structured business research report..."
      : "Generated the business research report draft.";
  }

  if (event.agent === "reviewer" || event.agent === "reviewer_revision") {
    return event.status === "running"
      ? "Reviewing the report for completeness, consistency and supporting evidence..."
      : "Validated the report against the research objective and evidence.";
  }

  return event.message || "Processing the research workflow...";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AgentTimeline({ events }: { events: RunEvent[] }) {
  const relevant = events.filter((e) => e.status === "completed" || e.status === "failed" || e.status === "running");

  if (relevant.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Timeline events will appear here as agents start working."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <ol className="space-y-0">
        {relevant.map((event, idx) => {
          const meta = AGENT_META[event.agent] ?? AGENT_META.system;
          const Icon = meta.icon;
          const isLast = idx === relevant.length - 1;
          const isRevision = event.agent === "writer_revision" || event.agent === "reviewer_revision";

          return (
            <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-border"
                  aria-hidden
                />
              )}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  event.status === "failed"
                    ? "bg-error/10 text-error"
                    : event.status === "running"
                      ? "bg-accent/10 text-accent"
                      : "bg-success/10 text-success"
                }`}
              >
                {event.status === "failed" ? (
                  <AlertCircle size={14} />
                ) : event.status === "running" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-sm font-medium text-text-primary">
                    {meta.label}
                    {isRevision && (
                      <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                        Revision
                      </span>
                    )}
                  </p>
                  <span className="text-[11px] text-text-muted">{formatTime(event.timestamp)}</span>
                </div>
                <p className="mt-0.5 text-xs text-text-secondary">{activityMessage(event)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
