import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  History,
  LayoutDashboard,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import type { PageKey } from "../../pages/pageKey";
import ThemeToggle from "../ThemeToggle";

const NAV_ITEMS: {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "new",
    label: "New Research",
    icon: Sparkles,
  },
  {
    key: "history",
    label: "Research History",
    icon: History,
  },
  {
    key: "activity",
    label: "Agent Activity",
    icon: Bot,
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
  },
];

const GITHUB_URL =
  "https://github.com/Sirisha-55/agentic-ai-business-research";

export default function Sidebar({
  page,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        } ${
          collapsed
            ? "lg:w-[72px]"
            : "lg:w-64"
        } w-64`}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <Sparkles size={16} />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                Business Research
              </p>

              <p className="truncate text-[11px] text-text-muted">
                Agentic AI System
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onNavigate(item.key);
                  onCloseMobile();
                }}
                title={
                  collapsed
                    ? item.label
                    : undefined
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${
                  collapsed
                    ? "justify-center"
                    : ""
                } ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <Icon
                  size={17}
                  className="shrink-0"
                />

                {!collapsed && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="shrink-0 border-t border-border p-3">
          <div
            className={`flex items-center gap-1 ${
              collapsed
                ? "flex-col"
                : ""
            }`}
          >
            {/* Theme */}
            <ThemeToggle />

            {/* GitHub */}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View repository on GitHub"
              title="View repository on GitHub"
              className="
                group
                flex h-9 w-9 shrink-0 items-center justify-center
                rounded-lg
                text-text-secondary
                transition duration-150
                hover:bg-accent/10
                hover:text-accent
                focus:bg-accent/10
                focus:text-accent
                focus:outline-none
                active:bg-accent/10
                active:text-accent
              "
            >
              {/* GitHub Cat Logo */}
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.96.1-.74.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .96-.31 3.15 1.18A10.9 10.9 0 0 1 12 6.16c.97 0 1.94.13 2.85.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.77.12 3.06.73.81 1.17 1.84 1.17 3.1 0 4.43-2.69 5.41-5.25 5.69.41.35.78 1.04.78 2.1v3.12c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
              </svg>
            </a>

            {/* Collapse */}
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              title={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              className="
                hidden h-9 w-9 shrink-0 items-center justify-center
                rounded-lg
                text-text-secondary
                transition duration-150
                hover:bg-surface-2
                hover:text-text-primary
                lg:ml-auto
                lg:flex
              "
            >
              {collapsed ? (
                <ChevronsRight size={17} />
              ) : (
                <ChevronsLeft size={17} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}