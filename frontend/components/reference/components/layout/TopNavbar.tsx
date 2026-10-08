import { Menu } from "lucide-react";
import type { HealthStatus } from "../../types";

export default function TopNavbar({
  title,
  breadcrumb,
  health,
  systemOnline,
  onOpenMobileSidebar,
}: {
  title: string;
  breadcrumb?: string;
  health: HealthStatus | null;
  systemOnline: boolean;
  onOpenMobileSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      <div className="min-w-0">
        {breadcrumb && (
          <p className="truncate text-[11px] text-text-muted">
            {breadcrumb}
          </p>
        )}

        <h2 className="truncate text-sm font-semibold text-text-primary">
          {title}
        </h2>
      </div>

      {/* System status */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            systemOnline
              ? "border-success/30 bg-success/5 text-success"
              : "border-error/30 bg-error/5 text-error"
          }`}
          title={
            health
              ? `Backend status: ${health.status}`
              : "Backend health unavailable"
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              systemOnline
                ? "bg-success"
                : "bg-error"
            }`}
            aria-hidden
          />

          System {systemOnline ? "Online" : "Unavailable"}
        </span>
      </div>
    </header>
  );
}