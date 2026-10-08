import { Fragment } from "react";

import {
  BrainCircuit,
  Building2,
  FileCheck2,
  ListTodo,
  PenLine,
  Search,
  ShieldCheck,
  Swords,
  type LucideIcon,
} from "lucide-react";

import type {
  AgentKey,
  EventStatus,
  RunEvent,
} from "../types";

import AgentCard, {
  type AgentCardStatus,
} from "./AgentCard";

interface Stage {
  key: AgentKey;
  label: string;
  responsibility: string;
  icon: LucideIcon;
}

/*
 * Business Research workflow.
 *
 * Workflow:
 *
 * Planner
 *    ↓
 * Market
 *    ↓
 * Company
 *    ↓
 * Competitor
 *    ↓
 * Analysis
 *    ↓
 * Writer
 *    ↓
 * Reviewer
 *    ↓
 * Final Report
 */

const STAGES: Stage[] = [
  {
    key: "planner",
    label: "Planner",
    responsibility:
      "Breaks down the business research objective",
    icon: ListTodo,
  },
  {
    key: "market",
    label: "Market",
    responsibility:
      "Researches market trends and demand",
    icon: Search,
  },
  {
    key: "company",
    label: "Company",
    responsibility:
      "Analyzes the target company",
    icon: Building2,
  },
  {
    key: "competitor",
    label: "Competitor",
    responsibility:
      "Analyzes the competitive landscape",
    icon: Swords,
  },
  {
    key: "analysis",
    label: "Analysis",
    responsibility:
      "Finds trends, insights, and opportunities",
    icon: BrainCircuit,
  },
  {
    key: "writer",
    label: "Writer",
    responsibility:
      "Drafts the business research report",
    icon: PenLine,
  },
  {
    key: "reviewer",
    label: "Reviewer",
    responsibility:
      "Reviews the report for quality",
    icon: ShieldCheck,
  },
  {
    key: "final_report",
    label: "Final Report",
    responsibility:
      "Delivers the approved report",
    icon: FileCheck2,
  },
];

/*
 * Get the latest event for a particular agent.
 *
 * If an agent has:
 *
 * running
 * completed
 *
 * the completed event is used because it is the latest event.
 */
function latestEvent(
  events: RunEvent[],
  agent: AgentKey,
): RunEvent | null {
  const relevant = events.filter(
    (event) => event.agent === agent,
  );

  return relevant.length
    ? relevant[relevant.length - 1]
    : null;
}

/*
 * Convert backend event status into AgentCard status.
 *
 * Reference colors:
 *
 * pending   → Gray
 * running   → Blue
 * reviewing → Blue
 * completed → Green
 * failed    → Red
 */
function toStageStatus(
  status: EventStatus | undefined,
  isReviewer: boolean,
): AgentCardStatus {
  if (!status) {
    return "pending";
  }

  /*
   * While cancellation is happening,
   * keep the existing active/running visual.
   */
  if (status === "cancelling") {
    return "running";
  }

  /*
   * Reviewer remains blue while it is actively reviewing.
   */
  if (
    status === "running" &&
    isReviewer
  ) {
    return "reviewing";
  }

  /*
   * Normal status mapping.
   */
  if (status === "pending") {
    return "pending";
  }

  if (status === "running") {
    return "running";
  }

  if (status === "completed") {
    return "completed";
  }

  if (status === "failed") {
    return "failed";
  }

  return "pending";
}

export default function AgentWorkflow({
  events,
  finalReportReady,
  onSelectAgent,
}: {
  events: RunEvent[];
  finalReportReady: boolean;
  onSelectAgent?: (
    agent: AgentKey,
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <div className="flex flex-col md:flex-row md:items-start">
        {STAGES.map((stage, idx) => {
          const isLast =
            idx === STAGES.length - 1;

          const isFinal =
            stage.key === "final_report";

          const isReviewer =
            stage.key === "reviewer";

          /*
           * Determine current stage status.
           */
          let status: AgentCardStatus;

          /*
           * Final Report has special handling because
           * its completed state depends on the actual
           * final report being ready.
           */
          if (isFinal) {
            const finalEvent =
              latestEvent(
                events,
                "final_report",
              );

            if (
              finalReportReady ||
              finalEvent?.status ===
                "completed"
            ) {
              status = "completed";
            } else if (
              finalEvent?.status ===
              "running"
            ) {
              status = "running";
            } else if (
              finalEvent?.status ===
              "failed"
            ) {
              status = "failed";
            } else {
              status = "pending";
            }
          } else {
            /*
             * All other stages use their latest
             * backend event.
             */
            const event =
              latestEvent(
                events,
                stage.key,
              );

            status = toStageStatus(
              event?.status,
              isReviewer,
            );
          }

          /*
           * Connector states.
           *
           * Completed → GREEN
           * Running   → BLUE
           * Waiting   → GRAY
           */
          const connectorDone =
            status === "completed";

          const connectorRunning =
            status === "running" ||
            status === "reviewing";

          return (
            <Fragment key={stage.key}>
              <div className="flex-1">
                <AgentCard
                  icon={stage.icon}
                  name={stage.label}
                  responsibility={
                    stage.responsibility
                  }
                  status={status}
                  onClick={
                    !isFinal &&
                    status !== "pending" &&
                    onSelectAgent
                      ? () =>
                          onSelectAgent(
                            stage.key,
                          )
                      : undefined
                  }
                />
              </div>

              {!isLast && (
                <>
                  {/* =========================
                      MOBILE CONNECTOR
                      ========================= */}
                  <div className="ml-[22px] flex h-6 w-px items-center md:hidden">
                    <span
                      className={`h-full w-px ${
                        connectorDone
                          ? "bg-success/40"
                          : connectorRunning
                            ? "bg-accent/40"
                            : "bg-border"
                      }`}
                      aria-hidden
                    />
                  </div>

                  {/* =========================
                      DESKTOP CONNECTOR
                      ========================= */}
                  <div className="hidden w-8 shrink-0 md:mt-[22px] md:block lg:w-12">
                    <span
                      className={`block h-px w-full ${
                        connectorDone
                          ? "bg-success/40"
                          : connectorRunning
                            ? "bg-accent/40"
                            : "bg-border"
                      }`}
                      aria-hidden
                    />
                  </div>
                </>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}