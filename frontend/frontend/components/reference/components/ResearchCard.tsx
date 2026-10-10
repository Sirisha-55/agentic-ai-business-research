import { useState } from "react";
import { CheckCircle2, Layers, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { RunSummary } from "../types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

export default function ResearchCard({
  run,
  onClick,
  selected = false,
  sourcesCount,
  onDelete,
}: {
  run: RunSummary;
  onClick: () => void;
  selected?: boolean;
  sourcesCount?: number;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = /^\d+$/.test(run.run_id) && onDelete;

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete?.(run.run_id);
      setDeleteOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className={`relative rounded-xl border transition duration-150 ${
        selected
          ? "border-accent/50 bg-accent/5"
          : "border-border bg-surface hover:border-accent/30 hover:bg-surface-2/60"
      }`}>
        <button
          type="button"
          onClick={onClick}
          className="flex w-full flex-col gap-2 rounded-xl p-4 text-left"
        >
          <div className={`flex items-start justify-between gap-3 ${canDelete ? "pr-9" : ""}`}>
            <p className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">{run.objective}</p>
            <StatusBadge status={run.status} className="shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>{formatDateTime(run.created_at)}</span>
            {typeof sourcesCount === "number" && (
              <span className="flex items-center gap-1">
                <Layers size={11} />
                {sourcesCount} sources
              </span>
            )}
            {run.status === "completed" && run.approved !== null && (
              <span className={`flex items-center gap-1 ${run.approved ? "text-success" : "text-text-muted"}`}>
                <CheckCircle2 size={11} />
                {run.approved ? "Approved" : "Delivered"}
              </span>
            )}
          </div>
        </button>

        {canDelete && (
          <button
            type="button"
            aria-label={`Delete research: ${run.objective}`}
            title="Delete research"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setDeleteOpen(false); }}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${run.run_id}`}
            aria-describedby={`delete-description-${run.run_id}`}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"
          >
            <h2 id={`delete-title-${run.run_id}`} className="text-lg font-semibold text-text-primary">Delete this research?</h2>
            <p id={`delete-description-${run.run_id}`} className="mt-2 text-sm text-text-secondary">
              This permanently deletes the research record and report from the database. This action cannot be undone.
            </p>
            <p className="mt-3 line-clamp-2 rounded-md bg-bg p-3 text-sm text-text-primary">{run.objective}</p>
            {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteOpen(false)} disabled={deleting} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-surface-2">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
