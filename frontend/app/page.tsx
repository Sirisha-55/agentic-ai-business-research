'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clipboard,
  Clock3,
  Code2,
  Compass,
  Database,
  FileBarChart,
  FileText,
  GitBranch,
  Globe2,
  Layers3,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Printer,
  Search,
  Server,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from 'lucide-react'


// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------

type Theme = 'light' | 'dark' | 'system'

type View =
  | 'dashboard'
  | 'new'
  | 'workspace'
  | 'reports'
  | 'history'
  | 'architecture'

type Report = {
  id: string
  user_query?: string
  query?: string
  created_at?: string
  status?: string
  content?: string
  final_report?: string
}


// ---------------------------------------------------------
// API CONFIGURATION
// ---------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000'


// ---------------------------------------------------------
// REPORT DATE FORMATTER
// ---------------------------------------------------------

function formatReportDate(dateString?: string): string {
  if (!dateString) {
    return 'Date unavailable'
  }

  // The report timestamp is only used to show the calendar date.
  // We intentionally do not display the time because the backend
  // timestamp timezone can differ between local and deployed servers.
  const datePart = dateString.slice(0, 10)

  const [year, month, day] = datePart.split('-').map(Number)

  if (!year || !month || !day) {
    return 'Date unavailable'
  }

  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}


// ---------------------------------------------------------
// ERROR MESSAGE HELPER
// ---------------------------------------------------------

function getReadableErrorMessage(error: unknown): string {
  // Convert FastAPI validation details, normal Error objects,
  // strings, arrays and plain objects into readable text.
  if (typeof error === 'string') return error

  if (error instanceof Error && error.message) {
    return error.message
  }

  if (Array.isArray(error)) {
    return error
      .map(item => getReadableErrorMessage(item))
      .filter(Boolean)
      .join(' ')
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>

    if (typeof value.detail === 'string') return value.detail
    if (Array.isArray(value.detail)) {
      return getReadableErrorMessage(value.detail)
    }
    if (typeof value.msg === 'string') return value.msg
    if (typeof value.message === 'string') return value.message
  }

  return 'Unable to reach the research backend. Check that FastAPI is running.'
}


// ---------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------

const navItems: {
  id: View
  label: string
  icon: typeof LayoutDashboard
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'new',
    label: 'New research',
    icon: Plus,
  },
  {
    id: 'workspace',
    label: 'Research workspace',
    icon: Network,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart,
  },
  {
    id: 'history',
    label: 'Research history',
    icon: Archive,
  },
  {
    id: 'architecture',
    label: 'Architecture',
    icon: Code2,
  },
]


// ---------------------------------------------------------
// AGENTS
// ---------------------------------------------------------

const agents = [
  {
    // Must match the agent name emitted by the backend exactly.
    name: 'Planner Agent',
    description:
      'Breaks the research question into focused workstreams.',
    icon: Target,
    accent: 'blue',
  },
  {
    name: 'Market Agent',
    description:
      'Maps market size, trends, signals and dynamics.',
    icon: TrendingUp,
    accent: 'violet',
  },
  {
    name: 'Company Agent',
    description:
      'Builds a clear view of company performance.',
    icon: Building2,
    accent: 'cyan',
  },
  {
    name: 'Competitor Agent',
    description:
      'Surfaces competitive threats and white space.',
    icon: Compass,
    accent: 'amber',
  },
  {
    name: 'Analysis Agent',
    description:
      'Synthesizes evidence into actionable insights.',
    icon: BarChart3,
    accent: 'pink',
  },
  {
    name: 'Writer Agent',
    description:
      'Turns research into a decision-ready report.',
    icon: FileText,
    accent: 'green',
  },
  {
    name: 'Reviewer Agent',
    description:
      'Checks clarity, sources and strategic rigor.',
    icon: CheckCircle2,
    accent: 'indigo',
  },
  {
    name: 'Final Report Agent',
    description:
      'Produces the final reviewed business research report.',
    icon: FileBarChart,
    accent: 'violet',
  },

]


// ---------------------------------------------------------
// LIVE AGENT PROGRESS TYPES
// ---------------------------------------------------------

type AgentExecutionStatus = 'waiting' | 'running' | 'completed' | 'error'

type AgentProgress = {
  status: AgentExecutionStatus
  message: string
}

type AgentProgressMap = Record<string, AgentProgress>

const createInitialAgentProgress = (): AgentProgressMap =>
  Object.fromEntries(
    agents.map(agent => [
      agent.name,
      {
        status: 'waiting',
        message: 'Waiting to run.',
      },
    ])
  ) as AgentProgressMap


// ---------------------------------------------------------
// LOGO
// ---------------------------------------------------------

// Brand text has been removed.
// Only the neutral AI icon remains.
function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Sparkles size={17} />
      </span>
    </div>
  )
}


// ---------------------------------------------------------
// STATUS BADGE
// ---------------------------------------------------------

function StatusBadge({
  status = 'Connected',
}: {
  status?: string
}) {
  const tone = status.toLowerCase()

  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" />
      {status}
    </span>
  )
}


// ---------------------------------------------------------
// THEME SWITCHER
// ---------------------------------------------------------

function ThemeSwitcher({
  theme,
  setTheme,
}: {
  theme: Theme
  setTheme: (value: Theme) => void
}) {
  return (
    <div
      className="theme-switcher"
      aria-label="Theme mode"
    >
      {(
        [
          ['light', Sun],
          ['dark', Moon],
        ] as const
      ).map(([value, Icon]) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={theme === value ? 'active' : ''}
          title={`${value} mode`}
          aria-label={`${value} mode`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  )
}


// ---------------------------------------------------------
// SIDEBAR
// ---------------------------------------------------------

function Sidebar({
  view,
  setView,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onBack,
  canGoBack,
  theme,
  setTheme,
}: {
  view: View
  setView: (v: View) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
  onBack: () => void
  canGoBack: boolean
  theme: Theme
  setTheme: (value: Theme) => void
}) {
  return (
    <aside
      className={`sidebar ${
        collapsed ? 'collapsed' : ''
      } ${mobileOpen ? 'mobile-open' : ''}`}
    >

      <style jsx global>{`
        /* Desktop only: pin the sidebar to the viewport so the Collapse
           button always stays at the bottom-left, even while the page
           scrolls. Mobile keeps its own slide-in drawer behaviour. */
        @media (min-width: 1100px) {
          .app-shell aside.sidebar {
            position: sticky !important;
            top: 0 !important;
            align-self: flex-start !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: visible;
            display: flex;
            flex-direction: column;
          }

          .app-shell aside.sidebar > * {
            flex-shrink: 0;
          }

          .app-shell aside.sidebar .sidebar-bottom {
            margin-top: auto;
          }
        }

        /* Collapsed bar shows icons only. */
        .app-shell aside.sidebar.collapsed .main-nav button {
          justify-content: center;
        }

        .sidebar-theme-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 12px 10px;
        }

        .sidebar-theme-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #8f99ad;
        }

        .sidebar.collapsed .sidebar-theme-row {
          justify-content: center;
          padding-left: 6px;
          padding-right: 6px;
        }

        .theme-switcher {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px;
          border: 1px solid rgba(127,127,127,.22);
          border-radius: 11px;
          background: rgba(127,127,127,.08);
        }

        .theme-switcher button {
          width: 30px;
          height: 28px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #8f99ad;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: .2s ease;
        }

        .theme-switcher button.active {
          color: #111827;
          background: #ffffff;
          box-shadow: 0 1px 5px rgba(0,0,0,.18);
        }

        .theme-dark .theme-switcher button.active {
          color: #eef2ff;
          background: #252b3b;
          box-shadow: none;
        }
      `}</style>

      <div className="sidebar-top">

        <Logo collapsed={collapsed} />

        <button
          className="icon-btn mobile-close"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>

      </div>


      <button
        type="button"
        className="sidebar-edge-back"
        onClick={onBack}
        disabled={!canGoBack}
        title="Back"
        aria-label="Go back to previous screen"
      >
        <ArrowLeft size={14} />
      </button>


      <div className="workspace-pill">

        <span className="workspace-avatar">
          AI
        </span>

        {!collapsed && (
          <>
            <span>
              <strong>Business Research</strong>
              <small>Agentic AI System</small>
            </span>

            {/* Workspace dropdown removed. */}
          </>
        )}

      </div>


      <nav
        className="main-nav"
        aria-label="Main navigation"
      >

        {navItems.map(
          ({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={
                view === id ? 'active' : ''
              }
              title={collapsed ? label : undefined}
              aria-label={label}
              onClick={() => {
                setView(id)
                setMobileOpen(false)
              }}
            >

              <Icon size={18} />

              {/* Labels are hidden when the sidebar is collapsed. */}
              {!collapsed && <span>{label}</span>}

            </button>
          )
        )}

      </nav>


      <div className="sidebar-bottom">

        <div className="sidebar-theme-row">
          {!collapsed && <span className="sidebar-theme-label">Theme</span>}
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
        </div>

        <button
          className="collapse-btn"
          onClick={() =>
            setCollapsed(!collapsed)
          }
        >

          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <>
              <PanelLeftClose size={18} />
              <span>Collapse</span>
            </>
          )}

        </button>

      </div>

    </aside>
  )
}


// ---------------------------------------------------------
// TOPBAR
// ---------------------------------------------------------

function Topbar({
  title,
  theme,
  setTheme,
  onMenu,
  onHome,
  onBack,
  canGoBack,
}: {
  title: string
  theme: Theme
  setTheme: (value: Theme) => void
  onMenu: () => void
  onHome: () => void
  onBack: () => void
  canGoBack: boolean
}) {
  return (
    <header className="topbar reference-topbar">
      <style jsx global>{`
        .reference-topbar {
          min-height: 78px;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(127, 127, 127, 0.16);
          background: var(--topbar-bg);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .reference-topbar .topbar-title {
          min-width: 0;
          gap: 14px;
        }

        .reference-topbar .topbar-context {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .reference-topbar .reference-eyebrow {
          color: #9aa4ba;
          font-size: 13px;
          line-height: 1.2;
          margin-bottom: 3px;
        }

        .reference-topbar .reference-page-title {
          margin: 0;
          color: #f4f6fb;
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        .reference-topbar .topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .system-online-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 15px;
          border: 1px solid rgba(127, 127, 127, 0.22);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: #cbd2df;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .system-online-pill .online-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }

        @media (max-width: 760px) {
          .reference-topbar {
            min-height: 74px;
            padding: 13px 16px;
          }

          .reference-topbar .topbar-back {
            display: none !important;
          }

          .reference-topbar .mobile-menu {
            display: grid !important;
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
          }

          .reference-topbar .reference-eyebrow {
            font-size: 12px;
          }

          .reference-topbar .reference-page-title {
            font-size: 19px;
          }

          .system-online-pill {
            padding: 8px 11px;
            font-size: 13px;
          }

          .system-online-pill .online-dot {
            width: 8px;
            height: 8px;
          }
        }

        @media (max-width: 480px) {
          .system-online-pill {
            font-size: 0;
            width: 38px;
            height: 38px;
            justify-content: center;
            padding: 0;
          }

          .system-online-pill .online-dot {
            width: 9px;
            height: 9px;
          }
        }
      `}</style>

      <div className="topbar-title">
        <button
          className="icon-btn mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <button
          className="icon-btn topbar-back"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          type="button"
          className="topbar-context"
          onClick={onHome}
          title="Go to dashboard"
          aria-label="Go to dashboard"
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span className="reference-eyebrow">Research</span>
          <h1 className="reference-page-title">
            {title === 'Research workspace' ? 'Agent Activity' : title}
          </h1>
        </button>
      </div>

      <div className="topbar-actions">
        <span className="system-online-pill" aria-label="System online">
          <span className="online-dot" />
          System Online
        </span>
      </div>
    </header>
  )
}


// ---------------------------------------------------------
// STAT CARD
// ---------------------------------------------------------

function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  meta: string
  icon: typeof FileText
  tone: string
}) {
  return (
    <div className="stat-card">

      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>

      <div className="stat-copy">

        <span>{label}</span>

        <strong>{value}</strong>

        <small>{meta}</small>

      </div>

    </div>
  )
}


// ---------------------------------------------------------
// AGENT CARD
// ---------------------------------------------------------

function AgentCard({
  agent,
  index,
  compact = false,
}: {
  agent: typeof agents[number]
  index: number
  compact?: boolean
}) {
  const Icon = agent.icon

  return (
    <div
      className={`agent-card ${
        compact ? 'compact' : ''
      } accent-${agent.accent}`}
      style={{
        animationDelay: `${index * 70}ms`,
      }}
    >

      <div className="agent-card-top">

        <span className="agent-icon">
          <Icon size={18} />
        </span>

        <StatusBadge status="Ready" />

      </div>


      <div>

        <h3>{agent.name}</h3>

        <p>{agent.description}</p>

      </div>


      {!compact && (
        <div className="agent-footer">

          <span>
            <span className="mini-dot" />
            Architecture node
          </span>

          <MoreHorizontal size={16} />

        </div>
      )}

    </div>
  )
}


// ---------------------------------------------------------
// PIPELINE
// ---------------------------------------------------------

function Pipeline({
  setView,
}: {
  setView: (v: View) => void
}) {
  return (
    <section className="section pipeline-section">

      <style jsx global>{`
        .pl-flow {
          --pl-line: rgba(124, 108, 255, 0.7);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: 100%;
        }

        .pl-single {
          width: min(100%, 340px);
          margin: 0 auto;
        }

        .pl-three {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .pl-cell {
          min-width: 0;
          padding: 0 8px;
        }

        .pl-cell > * {
          height: 100%;
        }

        .pl-fan {
          position: relative;
          height: 44px;
        }

        .pl-fan svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .pl-fan path {
          fill: none;
          stroke: var(--pl-line);
          stroke-width: 2px;
          vector-effect: non-scaling-stroke;
        }

        .pl-fan i {
          position: absolute;
          bottom: 0;
          width: 0;
          height: 0;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid var(--pl-line);
        }

        .pl-vline {
          position: relative;
          width: 2px;
          height: 30px;
          margin: 0 auto;
          background: var(--pl-line);
        }

        .pl-vline::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -1px;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid var(--pl-line);
        }

        .pl-mobile-only {
          display: none;
        }

        @media (max-width: 640px) {
          .pl-three {
            grid-template-columns: 1fr;
            row-gap: 10px;
          }

          .pl-cell {
            padding: 0;
          }

          .pl-fan {
            display: none;
          }

          .pl-mobile-only {
            display: block;
          }
        }
      `}</style>

      <div className="section-heading">

        <div>

          <span className="section-kicker">
            <span className="kicker-line" />
            System overview
          </span>

          <h2>AI research pipeline</h2>

          <p>
            Eight specialized agents collaborate
            to turn complex questions into
            structured business intelligence.
          </p>

        </div>

        <button
          className="outline-btn"
          onClick={() => setView('architecture')}
        >
          View architecture
          <ArrowUpRight size={15} />
        </button>

      </div>


      <div className="pl-flow">

        {/* 1. Planner */}
        <div className="pl-single">
          <AgentCard agent={agents[0]} index={0} compact />
        </div>

        {/* Planner splits into three branches */}
        <div className="pl-fan" aria-hidden="true">
          <svg
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            focusable="false"
          >
            <path d="M50 0 V22 M16.6667 22 H83.3333 M16.6667 22 V44 M50 22 V44 M83.3333 22 V44" />
          </svg>
          <i style={{ left: '16.6667%' }} />
          <i style={{ left: '50%' }} />
          <i style={{ left: '83.3333%' }} />
        </div>
        <div className="pl-vline pl-mobile-only" aria-hidden="true" />

        {/* 2. Market, Company, Competitor */}
        <div className="pl-three">
          {agents.slice(1, 4).map((agent, i) => (
            <div key={agent.name} className="pl-cell">
              <AgentCard agent={agent} index={i + 1} compact />
            </div>
          ))}
        </div>

        {/* The three branches merge into Analysis */}
        <div className="pl-fan" aria-hidden="true">
          <svg
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            focusable="false"
          >
            <path d="M16.6667 0 V22 M50 0 V22 M83.3333 0 V22 M16.6667 22 H83.3333 M50 22 V44" />
          </svg>
          <i style={{ left: '50%' }} />
        </div>
        <div className="pl-vline pl-mobile-only" aria-hidden="true" />

        {/* 3. Analysis → Writer → Reviewer → Final report */}
        <div className="pl-single">
          <AgentCard agent={agents[4]} index={4} compact />
        </div>

        <div className="pl-vline" aria-hidden="true" />

        <div className="pl-single">
          <AgentCard agent={agents[5]} index={5} compact />
        </div>

        <div className="pl-vline" aria-hidden="true" />

        <div className="pl-single">
          <AgentCard agent={agents[6]} index={6} compact />
        </div>

        <div className="pl-vline" aria-hidden="true" />

        <div className="pl-single">
          <AgentCard agent={agents[7]} index={7} compact />
        </div>

      </div>

    </section>
  )
}


// ---------------------------------------------------------
// EMPTY STATE
// ---------------------------------------------------------

function EmptyState({
  title = 'No research yet',
  description = 'Start your first research project to see reports here.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        <FileText size={22} />
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

    </div>
  )
}


// ---------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------

export default function Page() {

  const [theme, setThemeState] =
    useState<Theme>('light')

  const [view, setViewState] =
    useState<View>('dashboard')

  // Screen history so Back steps D -> C -> B -> A.
  // Refs are used because startResearch runs async and would
  // otherwise read a stale `view`.
  const viewRef = useRef<View>('dashboard')
  const stackRef = useRef<View[]>([])
  const [canGoBack, setCanGoBack] = useState(false)

  const setView = (next: View) => {
    const current = viewRef.current
    if (next === current) return
    stackRef.current = [...stackRef.current.slice(-29), current]
    viewRef.current = next
    setViewState(next)
    setCanGoBack(true)
  }

  const goBack = () => {
    const previous = stackRef.current.pop()
    if (!previous) return
    viewRef.current = previous
    setViewState(previous)
    setCanGoBack(stackRef.current.length > 0)
  }

  useEffect(() => {
    const update = () => {
      const bar = document.querySelector<HTMLElement>('.topbar')
      if (bar) {
        document.documentElement.style.setProperty(
          '--topbar-h',
          `${bar.offsetHeight}px`
        )
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem('business-research-theme')
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    window.localStorage.setItem('business-research-theme', theme)
  }, [theme])

  const [collapsed, setCollapsed] =
    useState(false)

  const [mobileOpen, setMobileOpen] =
    useState(false)

  const [reports, setReports] =
    useState<Report[]>([])

  const [loadingReports, setLoadingReports] =
    useState(true)

  const [backendOffline, setBackendOffline] =
    useState(false)

  const [query, setQuery] =
    useState('')

  const [researching, setResearching] =
    useState(false)

  // Stores the real status received from the FastAPI SSE endpoint.
  const [agentProgress, setAgentProgress] =
    useState<AgentProgressMap>(
      createInitialAgentProgress()
    )

  // Shows the latest message emitted by the active agent.
  const [activeAgentMessage, setActiveAgentMessage] =
    useState('Waiting to start research.')

  const [error, setError] =
    useState('')

  const [selectedReport, setSelectedReport] =
    useState<Report | null>(null)

  const [historySearch, setHistorySearch] =
    useState('')


  // -------------------------------------------------------
  // LOAD SAVED THEME
  // -------------------------------------------------------

  useEffect(() => {

    const stored =
      window.localStorage.getItem(
        'research-theme'
      ) as Theme | null

    if (stored) {
      setThemeState(stored)
    }

  }, [])


  // -------------------------------------------------------
  // APPLY THEME
  // -------------------------------------------------------

  useEffect(() => {

    const root =
      document.documentElement

    root.classList.toggle(
      'dark',
      theme === 'dark' ||
        (
          theme === 'system' &&
          window.matchMedia(
            '(prefers-color-scheme: dark)'
          ).matches
        )
    )

    root.classList.toggle(
      'light',
      theme === 'light'
    )

    window.localStorage.setItem(
      'research-theme',
      theme
    )

  }, [theme])


  // -------------------------------------------------------
  // LOAD BACKEND DATA
  // -------------------------------------------------------

  useEffect(() => {

    const fetchData = async () => {

      try {

        const list =
          await axios.get(
            `${API_BASE}/reports`
          )

        const rawReports = Array.isArray(list.data)
          ? list.data
          : list.data?.reports || []

        setReports(
          rawReports.map((report: any) => ({
            ...report,
            content: report.content ?? report.final_report,
          }))
        )

        setBackendOffline(false)

      } catch {

        // Keep the dashboard usable while the backend is unavailable.
        // Real backend connectivity will be handled when API integration is enabled.

        setBackendOffline(true)

        setReports([])

      } finally {

        setLoadingReports(false)

      }

    }

    fetchData()

  }, [])


  // -------------------------------------------------------
  // LIVE RESEARCH PROGRESS
  // -------------------------------------------------------

  // The progress UI is driven by actual events from the backend.
  // No timer or estimated progress is used anymore.


// -------------------------------------------------------
  // THEME
  // -------------------------------------------------------

  const setTheme = (value: Theme) =>
    setThemeState(value)


  // -------------------------------------------------------
  // CURRENT PAGE TITLE
  // -------------------------------------------------------

  const title =
    navItems.find(
      item => item.id === view
    )?.label || 'Dashboard'


  // -------------------------------------------------------
  // FILTER REPORTS
  // -------------------------------------------------------

  const filteredReports =
    useMemo(
      () =>
        reports.filter(
          report =>
            (
              report.user_query ||
              report.query ||
              ''
            )
              .toLowerCase()
              .includes(
                historySearch.toLowerCase()
              )
        ),
      [reports, historySearch]
    )


  // -------------------------------------------------------
  // START RESEARCH
  // -------------------------------------------------------

  const startResearch = async () => {

    const researchQuery = query.trim()

    // Validate before changing the UI to the workspace.
    if (!researchQuery) {
      setError('Please enter a research question.')
      return
    }

    if (researchQuery.length < 5) {
      setError('Research question must be at least 5 characters.')
      return
    }

    if (researchQuery.length > 1000) {
      setError('Research question must be 1000 characters or less.')
      return
    }

    if (researching) return

    setError('')
    setResearching(true)
    setAgentProgress(createInitialAgentProgress())
    setActiveAgentMessage('Research started.')

    // Open the workspace only after validation succeeds.
    setView('workspace')

    try {
      const response = await fetch(
        `${API_BASE}/research/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ user_query: researchQuery }),
        }
      )

      if (!response.ok) {
        let detail: unknown = ''

        try {
          const errorBody = await response.json()
          detail = errorBody?.detail || ''
        } catch {
          // Ignore non-JSON error responses.
        }

        if (response.status === 429) {
          throw new Error('The research queue is busy. Please try again in a moment.')
        }

        throw new Error(
          getReadableErrorMessage(detail) ||
          'Unable to start the research service.'
        )
      }

      if (!response.body) {
        throw new Error('The backend did not provide a streaming response.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const processEvent = (eventBlock: string) => {
        const lines = eventBlock.split(/\r?\n/)
        let eventName = 'message'
        let dataText = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim()
          }
          if (line.startsWith('data:')) {
            dataText += line.slice(5).trim()
          }
        }

        if (!dataText) return null

        try {
          return { eventName, data: JSON.parse(dataText) }
        } catch {
          return null
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const eventBlocks = buffer.split(/\r?\n\r?\n/)
        buffer = eventBlocks.pop() || ''

        for (const eventBlock of eventBlocks) {
          const parsed = processEvent(eventBlock)
          if (!parsed) continue

          const { eventName, data } = parsed

          if (eventName === 'research_started') {
            setActiveAgentMessage(
              typeof data?.message === 'string' ? data.message : 'Research started.'
            )
            continue
          }

          if (eventName === 'agent_progress') {
            const agentName = data?.agent as string | undefined
            const status = data?.status as AgentExecutionStatus | undefined
            const message = typeof data?.message === 'string' ? data.message : undefined

            if (agentName && status) {
              setAgentProgress(current => ({
                ...current,
                [agentName]: {
                  status,
                  message: message || current[agentName]?.message || '',
                },
              }))

              setActiveAgentMessage(message || `${agentName} is working.`)
            }
            continue
          }

          if (eventName === 'research_completed') {
            const finalReport =
              typeof data?.final_report === 'string' ? data.final_report : ''

            const report = {
              id: data?.report_id,
              user_query: researchQuery,
              final_report: finalReport,
              content: finalReport,
              created_at: data?.created_at,
              status: 'completed',
            }

            setAgentProgress(current => {
              const completed = { ...current }
              Object.keys(completed).forEach(agentName => {
                completed[agentName] = {
                  status: 'completed',
                  message: completed[agentName]?.message || 'Completed successfully.',
                }
              })
              return completed
            })

            setActiveAgentMessage('Final report is ready.')
            setReports(current => [
              report,
              ...current.filter(existing => String(existing.id) !== String(report.id)),
            ])
            setSelectedReport(report)

            // Clear the box, but only if it still holds the question just submitted.
            setQuery(current =>
              current.trim() === researchQuery ? '' : current
            )

            setView('reports')
            continue
          }

          if (eventName === 'research_error') {
            throw new Error(getReadableErrorMessage(data?.detail))
          }
        }
      }

      if (buffer.trim()) {
        const parsed = processEvent(buffer)
        if (parsed?.eventName === 'research_error') {
          throw new Error(getReadableErrorMessage(parsed.data?.detail))
        }
      }

    } catch (err: unknown) {
      setAgentProgress(current => {
        const updated = { ...current }
        Object.keys(updated).forEach(agentName => {
          if (updated[agentName].status === 'running') {
            updated[agentName] = {
              ...updated[agentName],
              status: 'error',
            }
          }
        })
        return updated
      })

      // Always store a string so React never renders [object Object].
      setError(getReadableErrorMessage(err))

    } finally {
      setResearching(false)
    }
  }


  // -------------------------------------------------------
  // AUTO-OPEN FINAL REPORT
  // -------------------------------------------------------
  // Once the Final Report Agent has completed and the backend has
  // returned the saved report, move directly from Agent Activity
  // to the generated report.
  useEffect(() => {
    const finalStatus =
      agentProgress['Final Report Agent']?.status

    if (
      finalStatus === 'completed' &&
      selectedReport &&
      viewRef.current === 'workspace'
    ) {
      setView('reports')
    }
  }, [agentProgress, selectedReport])


  // -------------------------------------------------------
  // DELETE REPORT
  // -------------------------------------------------------

  const deleteReport =
    async (id: string) => {

      const reportId = String(id)

      try {
        await axios.delete(
          `${API_BASE}/reports/${reportId}`
        )

        setReports(current =>
          current.filter(report =>
            String(
              report.id ??
              (report as any).report_id ??
              ''
            ) !== reportId
          )
        )

        if (
          selectedReport &&
          String(selectedReport.id) === reportId
        ) {
          setSelectedReport(null)
        }

        return true
      } catch {
        setError(
          'Unable to delete this report. Please try again.'
        )

        return false
      }
    }


  // -------------------------------------------------------
  // RENAME REPORT
  // -------------------------------------------------------

  const renameReport =
    async (
      id: string,
      newTitle: string
    ): Promise<boolean> => {

      const reportId = String(id)
      const title = newTitle.trim()

      if (!reportId || !title) return false

      // Update the screen immediately.
      setReports(current =>
        current.map(report =>
          String(
            report.id ??
            (report as any).report_id ??
            ''
          ) === reportId
            ? { ...report, user_query: title, query: title }
            : report
        )
      )

      // Then save to the backend (see the PATCH route in the notes).
      try {
        await axios.patch(
          `${API_BASE}/reports/${reportId}`,
          { user_query: title }
        )

        return true
      } catch {
        return false
      }
    }


  // -------------------------------------------------------
  // OPEN REPORT
  // -------------------------------------------------------

  const openReport =
    async (report: Report) => {

      const reportId = String(
        report.id ??
        (report as any).report_id ??
        ''
      )

      if (report.content || report.final_report) {
        setSelectedReport({
          ...report,
          id: reportId,
          content:
            report.content ??
            report.final_report,
        })
        setView('reports')
        return
      }

      try {
        const response = await axios.get(
          `${API_BASE}/reports/${reportId}`
        )

        const openedReport =
          response.data?.report ??
          response.data

        setSelectedReport({
          ...report,
          ...openedReport,
          id: String(
            openedReport?.id ??
            openedReport?.report_id ??
            reportId
          ),
          content:
            openedReport?.content ??
            openedReport?.final_report ??
            report.content ??
            report.final_report,
        })

        setView('reports')
      } catch {
        setError('Unable to open report.')
      }
    }


  // -------------------------------------------------------
  // RENDER CURRENT VIEW
  // -------------------------------------------------------

  const renderView = () => {

    if (view === 'new') {
      return (
        <NewResearch
          query={query}
          setQuery={setQuery}
          onStart={startResearch}
          researching={researching}
          agentProgress={agentProgress}
          activeAgentMessage={activeAgentMessage}
          error={error}
          />
      )
    }

    if (view === 'workspace') {
      return (
        <Workspace
          query={query}
          researching={researching}
          agentProgress={agentProgress}
          activeAgentMessage={activeAgentMessage}
        />
      )
    }

    if (view === 'reports') {
      return (
        <Reports
          reports={reports}
          selectedReport={selectedReport}
          setSelectedReport={setSelectedReport}
          onRename={renameReport}
          onDelete={deleteReport}
        />
      )
    }

    if (view === 'history') {
      return (
        <History
          reports={filteredReports}
          search={historySearch}
          setSearch={setHistorySearch}
          onOpen={openReport}
          onDelete={deleteReport}
          loading={loadingReports}
        />
      )
    }

    if (view === 'architecture') {
      return <Architecture />
    }

    return (
      <Dashboard
        reports={reports}
        setView={setView}
        onOpenReport={openReport}
        onDeleteReport={deleteReport}
      />
    )
  }


  // -------------------------------------------------------
  // APPLICATION LAYOUT
  // -------------------------------------------------------

  return (
    <div className={`app-shell theme-${theme}`}>

      <style jsx global>{`
        :root {
          --accent-red: #b83a3a;
          --topbar-bg: rgba(10, 14, 23, 0.9);
        }
        .theme-dark { background: #090b11; color: #eef2ff; }

        html.dark { --accent-red: #e0625f; }
        html.light { --topbar-bg: rgba(248, 250, 252, 0.94); --accent-red: #4f46e5; }

        /* -------------------------------------------------------
           LIGHT THEME
           The activity/research UI keeps the same layout in both
           themes; only surfaces, borders and text contrast change.
        ------------------------------------------------------- */
        .theme-light {
          color: #172033;
          background: #f5f7fb;
        }
        .theme-light .sidebar,
        .theme-light .main-shell,
        .theme-light .content,
        .theme-light .business-activity-page,
        .theme-light .business-activity-card,
        .theme-light .business-agent-card,
        .theme-light .workspace-query-card,
        .theme-light .workspace-node,
        .theme-light .stat-card,
        .theme-light .query-card,
        .theme-light .report-tile,
        .theme-light .history-row,
        .theme-light .table-card,
        .theme-light .aside-card,
        .theme-light .insight-card,
        .theme-light .example-card,
        .theme-light .report-nav,
        .theme-light .report-viewer,
        .theme-light .report-toolbar {
          background: #ffffff !important;
          color: #172033;
          border-color: #dfe4ee !important;
        }
        .theme-light .topbar,
        .theme-light .reference-topbar {
          background: rgba(248, 250, 252, .94) !important;
          color: #172033;
          border-bottom-color: #dfe4ee !important;
        }
        .theme-light .main-nav button,
        .theme-light .collapse-btn,
        .theme-light .sidebar-theme-label,
        .theme-light .reference-eyebrow,
        .theme-light .business-agent-role,
        .theme-light .business-agent-update,
        .theme-light .business-objective-label,
        .theme-light .business-parallel-label,
        .theme-light .report-meta,
        .theme-light .report-id-quiet,
        .theme-light .stat-copy span,
        .theme-light .stat-copy small,
        .theme-light .empty-state p {
          color: #647089 !important;
        }
        .theme-light .main-nav button {
          background: transparent;
          color: #334155;
        }
        .theme-light .main-nav button:hover {
          background: #eef2ff;
          color: #4338ca;
        }
        .theme-light .main-nav button.active {
          background: #eef2ff;
          color: #4338ca;
        }
        .theme-light .reference-page-title,
        .theme-light .business-agent-name,
        .theme-light .business-detail-label,
        .theme-light .business-objective,
        .theme-light .business-final-report-ready,
        .theme-light .report-content,
        .theme-light .report-content h1,
        .theme-light .report-content h2,
        .theme-light .report-content h3,
        .theme-light .report-content strong,
        .theme-light .stat-copy strong {
          color: #172033 !important;
        }
        .theme-light .business-run-pill,
        .theme-light .business-agent-status,
        .theme-light .status {
          background: #ecfdf3;
          color: #15803d;
          border-color: #bbf7d0;
        }
        .theme-light .business-agent-icon {
          background: #ecfdf3 !important;
          color: #16a34a !important;
          border-color: #bbf7d0 !important;
        }
        .theme-light .system-online-pill {
          background: #ffffff !important;
          color: #475569 !important;
          border-color: #dfe4ee !important;
        }
        .theme-light .report-nav a {
          color: #647089;
        }
        .theme-light .report-nav a.active {
          background: #eef2ff;
          color: #4338ca;
        }
        .theme-light .primary-btn {
          background: #4f46e5;
          color: #fff;
        }
        .theme-light .outline-btn,
        .theme-light .text-btn {
          color: #334155;
          border-color: #dfe4ee;
          background: #fff;
        }
        .theme-light .business-final-report-ready {
          border-color: #c7d2fe !important;
          background: #f5f7ff !important;
        }
        .theme-light .workspace-banner {
          background: linear-gradient(135deg, #ffffff, #f5f7ff) !important;
          border-color: #dfe4ee !important;
        }

        /* small red accents */
        .brand-dot { color: var(--accent-red); }
        .section-kicker .kicker-line { background: var(--accent-red) !important; }
        .main-nav button.active { position: relative; }
        .main-nav button.active::before {
          content: ''; position: absolute; left: 0; top: 9px; bottom: 9px;
          width: 3px; border-radius: 3px; background: var(--accent-red);
        }
        .report-nav a.active { box-shadow: inset 2px 0 0 var(--accent-red); }
        .status-running .status-dot { background: var(--accent-red) !important; }
        .char-count.near-limit { color: var(--accent-red) !important; }

        /* fixed top bar */
        .app-shell, .main-shell { overflow-x: clip; }
        .main-shell { min-width: 0; }
        .topbar {
          position: sticky; top: 0; z-index: 40;
          background: var(--topbar-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* back button attached to the sidebar edge */
        .sidebar-edge-back, .topbar .topbar-back { display: none; }
        @media (min-width: 1100px) {
          .app-shell aside.sidebar { z-index: 45; }
          .sidebar-edge-back {
            display: grid; place-items: center; position: absolute;
            top: 72px; right: -14px; width: 28px; height: 28px; padding: 0;
            border-radius: 50%; cursor: pointer; z-index: 60;
            border: 1px solid rgba(127, 127, 127, 0.4);
            background: #1b2333; color: #dfe5f3;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            transition: color 0.2s, border-color 0.2s, transform 0.2s;
          }
          .sidebar-edge-back:hover:not(:disabled) {
            color: var(--accent-red); border-color: var(--accent-red); transform: scale(1.08);
          }
          .sidebar-edge-back:disabled { opacity: 0.35; cursor: default; }
        }
        @media (max-width: 1099px) {
          .topbar .topbar-back { display: inline-grid; }
          .topbar .topbar-back:disabled { opacity: 0.35; }
        }

        /* dividers only between report sections */
        .report-content section { border-top: 0 !important; }
        .report-content .markdown-content > section + section {
          border-top: 1px solid rgba(127, 127, 127, 0.3) !important;
          margin-top: 36px; padding-top: 32px;
        }
        .report-content .report-section-body > *,
        .report-content .report-markdown-block,
        .report-content .report-markdown-block p,
        .report-content .report-markdown-block li {
          border-top: 0 !important; border-bottom: 0 !important; box-shadow: none !important;
        }

        /* more room above the pipeline diagram */
        .pipeline-section { margin-top: 56px !important; }
        .pl-flow { padding-top: 20px; }

        /* darker, higher-contrast light theme */
        html.light body, html.light .app-shell { background: #eef2f8 !important; color: #0e1a33; }
        html.light .sidebar {
          background: #13213f !important; border-color: #0c1830 !important; color: #e6ecf8;
        }
        html.light .sidebar .main-nav button,
        html.light .sidebar .collapse-btn { color: #c3cde4; }
        html.light .sidebar .main-nav button:hover { background: rgba(255, 255, 255, 0.07); }
        html.light .sidebar .main-nav button.active { background: rgba(255, 255, 255, 0.13); color: #fff; }
        html.light .sidebar small { color: #9fb0d3; }
        html.light .stat-card, html.light .agent-card, html.light .query-card,
        html.light .table-card, html.light .research-row, html.light .report-tile,
        html.light .aside-card, html.light .insight-card, html.light .workspace-node,
        html.light .example-card, html.light .workspace-query-card,
        html.light .workspace-banner, html.light .research-progress,
        html.light .stack-node, html.light .arch-node, html.light .empty-state {
          background: #f1f5fc !important; border: 1px solid #bcc8df !important;
          color: #0e1a33; box-shadow: 0 1px 2px rgba(19, 33, 63, 0.08);
        }
        html.light .content p { color: #34435f; }
        html.light .topbar-brand em, html.light .ar-toggle, html.light .ar-chip { color: #5b4bd6 !important; }

        /* responsive */
        .hero-actions { flex-wrap: wrap; }
        @media (max-width: 1100px) {
          .split-sections, .workspace-grid { grid-template-columns: 1fr !important; }
          .hero { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .hero-visual { display: none !important; }
          .content { padding-left: 14px !important; padding-right: 14px !important; }
          .topbar { padding-left: 12px !important; padding-right: 12px !important; }
          .topbar-brand { white-space: normal !important; }
          .page-intro, .section-heading, .query-footer, .report-toolbar {
            flex-direction: column; align-items: flex-start; gap: 12px;
          }
          .query-footer .primary-btn { width: 100%; justify-content: center; }
          .example-grid, .report-grid { grid-template-columns: 1fr !important; }
          .history-table { overflow-x: auto; }
          .history-header, .history-row { min-width: 640px; }
          .hero h2 { font-size: clamp(28px, 9vw, 40px) !important; }
          .ar-chain { width: 100%; }
        }

        /* ---- light-mode contrast + more red ---- */
        html.light .content h1, html.light .content h2, html.light .content h3,
        html.light .content h4 { color: #0b1630 !important; }
        html.light .content h2 em { color: #4b3bc4 !important; }
        html.light .content strong { color: #0e1a33; }
        html.light .content small,
        html.light .row-main span { color: #44526d !important; }
        html.light .hero {
          background: #f1f5fc !important; border: 1px solid #bcc8df !important;
        }
        html.light .accent-eyebrow, html.light .section-kicker,
        html.light .accent-eyebrow svg { color: var(--accent-red) !important; }
        html.light .text-btn, html.light .report-tile-link { color: var(--accent-red) !important; }
        html.light .network-stat strong { color: var(--accent-red) !important; }
        .outline-btn:hover, .example-card:hover, .research-row:hover, .report-tile:hover {
          border-color: var(--accent-red) !important;
        }
        .research-row:hover .row-icon, .report-tile:hover .row-icon { color: var(--accent-red); }
        .report-content h3 {
          border-left: 3px solid var(--accent-red); padding-left: 12px;
        }
        .status { text-transform: capitalize; }

        /* ---- report text: darker grey, still grey ---- */
        html.light .report-section-body, html.light .report-section-body p,
        html.light .report-section-body li, html.light .report-section-body td,
        html.light .report-section-body blockquote {
          color: #3f4a5f !important; opacity: 1 !important;
        }
        html.light .report-section-body strong { color: #1b2640 !important; }
        html.light .report-section-body * { opacity: 1 !important; }

        /* ---- one scrollbar: the page scrolls, not the report box ---- */
        .report-viewer {
          height: auto !important; min-height: 0 !important;
          overflow: visible !important; overscroll-behavior: auto;
        }
        .report-layout { min-height: 0 !important; }
        .report-nav {
          top: calc(var(--topbar-h, 92px) + 64px) !important;
          max-height: calc(100vh - var(--topbar-h, 92px) - 88px) !important;
        }
        .report-content section {
          scroll-margin-top: calc(var(--topbar-h, 92px) + 72px) !important;
        }

        /* download / print stay put, just under the top bar */
        .report-toolbar {
          position: sticky; top: var(--topbar-h, 92px); z-index: 30;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 8px 0; margin-bottom: 8px;
          background: var(--topbar-bg);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        .report-toolbar .toolbar-actions { display: flex; gap: 8px; margin-left: auto; }
        .business-final-report-ready {
          margin-top: 16px;
          padding: 16px 18px;
          border: 1px solid rgba(99, 102, 241, 0.28);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: rgba(99, 102, 241, 0.08);
        }

        html.light .business-final-report-ready {
          border-color: rgba(79, 70, 229, 0.18);
          background: #f5f7ff;
        }

        .business-final-report-ready > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .business-final-report-kicker {
          color: #818cf8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        html.light .business-final-report-kicker {
          color: #4f46e5;
        }

        .business-final-report-ready strong {
          font-size: 14px;
          line-height: 1.45;
        }

        .business-final-report-ready button {
          flex: 0 0 auto;
          border: 0;
          border-radius: 11px;
          padding: 10px 14px;
          background: #6366f1;
          color: #fff;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
        }

        .business-final-report-ready button:hover {
          background: #5558e8;
        }

        @media (max-width: 900px) {
          .report-nav { top: calc(var(--topbar-h, 92px) + 56px) !important; max-height: none !important; }
        }
        @media (max-width: 760px) {
          .report-toolbar { flex-direction: row !important; align-items: center !important; }
        }

        /* ---- section kicker: diamond bullet instead of the old line ---- */
        .section-kicker .kicker-line {
          flex: 0 0 auto;
          width: 8px !important; height: 8px !important;
          min-width: 8px; border-radius: 2px;
          background: var(--accent-red) !important;
          transform: rotate(45deg);
          box-shadow: 0 0 0 3px rgba(184, 58, 58, 0.18);
        }
        html.dark .section-kicker .kicker-line { box-shadow: 0 0 0 3px rgba(224, 98, 95, 0.22); }

        /* ---- progress step line + quiet report meta ---- */
        .step-line {
          display: block; margin: 2px 0 4px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
          color: var(--accent-red);
        }
        .report-id-quiet { font-size: 11px; opacity: 0.7; }

        /* ---- keyboard focus rings ---- */
        button:focus-visible, a:focus-visible, input:focus-visible,
        textarea:focus-visible, [role='button']:focus-visible {
          outline: 2px solid var(--accent-red);
          outline-offset: 2px;
        }

        /* ---- report blocks: same alignment and size as the intro paragraph ---- */
        .report-section-body .report-markdown-block {
          margin-left: 0 !important; padding-left: 0 !important;
        }
        .report-section-body .report-markdown-block p {
          margin-left: 0 !important; padding-left: 0 !important; text-indent: 0 !important;
          font-size: inherit !important;
        }
        .report-section-body .report-markdown-block ul {
          margin-left: 0 !important; padding-left: 20px !important; list-style: disc outside !important;
        }
        .report-section-body .report-markdown-block li {
          font-size: inherit !important; padding-left: 2px;
        }
        .report-section-body .report-markdown-block li::marker { color: var(--accent-red); }

        /* Reference-style mobile shell: no horizontal overflow and compact page gutters. */
        .workspace-shell .content {
          padding-top: 0 !important;
        }

        @media (max-width: 760px) {
          html, body {
            overflow-x: hidden !important;
          }

          .main-shell {
            min-width: 0 !important;
          }

          .content {
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px 12px 28px !important;
          }

          .page-intro {
            gap: 10px !important;
          }

          .page-intro h2 {
            font-size: 29px !important;
            line-height: 1.1 !important;
          }

          .page-intro p {
            font-size: 14px !important;
            line-height: 1.5 !important;
          }

          .hero {
            border-radius: 18px !important;
            padding: 22px 18px !important;
          }

          .stat-card, .query-card, .table-card, .report-tile, .aside-card {
            border-radius: 16px !important;
          }

          .history-table {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }

          .report-viewer {
            height: auto !important;
            overflow: visible !important;
          }

          .report-toolbar {
            padding: 7px 0 !important;
          }

          .report-toolbar .back-btn {
            max-width: 55%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .report-content h2 {
            font-size: clamp(30px, 9vw, 48px) !important;
            line-height: 1.06 !important;
            letter-spacing: -0.035em !important;
          }

          .report-nav {
            margin-bottom: 4px;
            border-radius: 12px;
          }

          .report-nav a {
            font-size: 12px !important;
          }
        }
      `}</style>


      <Sidebar
        view={view}
        setView={setView}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onBack={goBack}
        canGoBack={canGoBack}
        theme={theme}
        setTheme={setTheme}
      />

      <div className={`main-shell ${view === 'workspace' ? 'workspace-shell' : ''}`}>

        <Topbar
          title={title}
          theme={theme}
          setTheme={setTheme}
          onMenu={() =>
            setMobileOpen(true)
          }
          onBack={goBack}
          canGoBack={canGoBack}
          onHome={() => {
            setView('dashboard')
            setMobileOpen(false)
          }}
        />

        <main className="content">
          {backendOffline && (
            <div className="error-banner" role="status">
              <AlertCircle size={17} />
              Can\u2019t reach the research backend, so saved reports may be missing until it is back.
            </div>
          )}

          {renderView()}
        </main>

      </div>


      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

    </div>
  )
}


// ---------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------

function Dashboard({
  reports,
  setView,
  onOpenReport,
  onDeleteReport,
}: {
  reports: Report[]
  setView: (v: View) => void
  onOpenReport: (report: Report) => void
  onDeleteReport: (id: string) => void
}) {

  return (
    <div className="view-enter">

      <section className="hero">

        <div className="hero-glow" />

        <div className="hero-copy">

          <span className="eyebrow accent-eyebrow">
            <Sparkles size={13} />
            Intelligence workspace
          </span>

          <h2>
            AI-powered
            <br />
            <em>Business Research<span className="brand-dot">.</span></em>
          </h2>

          <p>
            Research markets, companies and
            competitors through an intelligent
            multi-agent AI workflow.
          </p>

          <div className="hero-actions">

            <button
              className="primary-btn"
              onClick={() =>
                setView('new')
              }
            >
              <Plus size={17} />
              Start new research
            </button>

            <button
              className="ghost-btn"
              onClick={() =>
                setView('reports')
              }
            >
              View reports
              <ArrowUpRight size={16} />
            </button>

          </div>

        </div>


        <div className="hero-visual">

          <div className="orb orb-one" />
          <div className="orb orb-two" />

          <div className="orb-core">

            <Sparkles size={22} />

            <span>
              8 Agents Ready
            </span>

          </div>

          <div className="visual-ring ring-one" />
          <div className="visual-ring ring-two" />

          <div className="visual-label label-one">
            <span className="mini-dot green" />
            AI Research Pipeline
          </div>

          <div className="visual-label label-two">
            <span className="mini-dot blue" />
            8 agents
          </div>

        </div>

      </section>


      <section
        className="stats-grid"
        style={{
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >

        <StatCard
          label="Total reports"
          value={reports.length}
          meta="Saved research reports"
          icon={FileBarChart}
          tone="blue"
        />

        <StatCard
          label="Completed research"
          value={
            reports.filter(
              r =>
                r.status === 'completed' ||
                !r.status
            ).length
          }
          meta="Ready to review"
          icon={CheckCircle2}
          tone="green"
        />

        <StatCard
          label="Active research"
          value={
            reports.filter(
              r =>
                r.status === 'running'
            ).length
          }
          meta="In progress"
          icon={Zap}
          tone="violet"
        />

      </section>


      <section className="split-sections">

        <section className="section recent-section">

          <div className="section-heading compact-heading">

            <div>

              <span className="section-kicker">
                <span className="kicker-line" />
                Your workspace
              </span>

              <h2>
                Recent research
              </h2>

            </div>

            <button
              className="text-btn"
              onClick={() =>
                setView('history')
              }
            >
              View history
              <ChevronRight size={15} />
            </button>

          </div>


          {reports.length ? (

            <div className="recent-list">

              {reports
                .slice(0, 4)
                .map((report, i) => (
                  <ResearchRow
                    key={
                      report.id || i
                    }
                    report={report}
                    onOpen={onOpenReport}
                  />
                ))}

            </div>

          ) : (
            <EmptyState
              title="No research yet"
              description="Start a research brief to build your first business intelligence report."
            />
          )}

        </section>


        <section className="insight-card">

          <div className="insight-orb">
            <Sparkles size={19} />
          </div>

          <span className="section-kicker">
            Power your next decision
          </span>

          <h3>
            Start with a question.
          </h3>

          <p>
            Give your research team a complex
            question and let the agent network
            find the signal.
          </p>

          <button
            className="outline-btn"
            onClick={() =>
              setView('new')
            }
          >
            Explore a query
            <ArrowUpRight size={15} />
          </button>

        </section>

      </section>


      <Pipeline setView={setView} />

    </div>
  )
}


// ---------------------------------------------------------
// RESEARCH ROW
// ---------------------------------------------------------

function ResearchRow({
  report,
  onOpen,
}: {
  report: Report
  onOpen: (report: Report) => void
}) {

  return (
    <div
      className="research-row"
      onClick={() => onOpen(report)}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(report)
        }
      }}
    >

      <div className="row-icon">
        <FileText size={17} />
      </div>

      <div className="row-main">
        <strong>
          {report.user_query ||
            report.query ||
            'Untitled research'}
        </strong>
        <span>
          {formatReportDate(report.created_at)}
          {' · '}
          {report.id
            ? `ID ${String(report.id).slice(0, 8)}`
            : 'Report'}
        </span>
      </div>

      <StatusBadge
        status={
          report.status ||
          'Completed'
        }
      />

    </div>
  )
}



// ---------------------------------------------------------
// ---------------------------------------------------------
// RESEARCH PROGRESS
// ---------------------------------------------------------

const researchProgressStages = [
  {
    name: 'Planner Agent',
    description: 'Breaking the research question into focused tasks.',
    icon: Target,
  },
  {
    name: 'Market Agent',
    description: 'Researching market size, trends and demand.',
    icon: TrendingUp,
  },
  {
    name: 'Company Agent',
    description: 'Collecting company and business information.',
    icon: Building2,
  },
  {
    name: 'Competitor Agent',
    description: 'Identifying competitors and comparing strategies.',
    icon: Compass,
  },
  {
    name: 'Analysis Agent',
    description: 'Connecting evidence and generating insights.',
    icon: BarChart3,
  },
  {
    name: 'Writer Agent',
    description: 'Preparing the structured business report.',
    icon: FileText,
  },
  {
    name: 'Reviewer Agent',
    description: 'Checking clarity, evidence and report quality.',
    icon: CheckCircle2,
  },
  {
    name: 'Final Report Agent',
    description: 'Preparing the final reviewed report.',
    icon: FileBarChart,
  },
]

function ResearchProgress({
  agentProgress,
  activeAgentMessage,
}: {
  agentProgress: AgentProgressMap
  activeAgentMessage: string
}) {

  return (
    <div className="research-progress">

      <div className="research-progress-header">

        <div>

          <span className="section-kicker">
            <span className="kicker-line" />
            Live agent workflow
          </span>

          <h3>Research in progress</h3>

          <span className="step-line">
            {researchProgressStages.every(
              st => agentProgress[st.name]?.status === 'completed'
            )
              ? 'All 8 steps complete'
              : `Step ${Math.min(
                  researchProgressStages.filter(
                    st => agentProgress[st.name]?.status === 'completed'
                  ).length + 1,
                  8
                )} of 8${
                  researchProgressStages.some(
                    st => agentProgress[st.name]?.status === 'running'
                  )
                    ? ' \u00b7 ' +
                      researchProgressStages
                        .filter(st => agentProgress[st.name]?.status === 'running')
                        .map(st => st.name)
                        .join(', ')
                    : ''
                }`}
          </span>

          <p>
            {activeAgentMessage}
          </p>

        </div>

        <span className="status status-running">
          <span className="status-dot" />
          Live
        </span>

      </div>

      <div className="research-progress-list">

        {researchProgressStages.map(stage => {

          const Icon = stage.icon

          const execution =
            agentProgress[
              stage.name
            ] || {
              status:
                'waiting' as AgentExecutionStatus,
              message:
                'Waiting to run.',
            }

          const completed =
            execution.status ===
            'completed'

          const active =
            execution.status ===
            'running'

          const failed =
            execution.status ===
            'error'

          return (
            <div
              key={stage.name}
              className={`research-progress-item ${
                completed
                  ? 'completed'
                  : active || failed
                  ? 'active'
                  : ''
              }`}
            >

              <span className="research-progress-icon">

                {completed ? (
                  <Check size={15} />
                ) : active ? (
                  <Loader2
                    size={15}
                    className="spin"
                  />
                ) : failed ? (
                  <AlertCircle
                    size={15}
                  />
                ) : (
                  <Icon size={15} />
                )}

              </span>

              <span className="research-progress-copy">

                <strong>
                  {stage.name}
                </strong>

                <small>
                  {execution.message}
                </small>

              </span>

              <span className="research-progress-state">

                {completed
                  ? 'Done'
                  : active
                  ? 'Working'
                  : failed
                  ? 'Error'
                  : 'Waiting'}

              </span>

            </div>
          )
        })}

      </div>

    </div>
  )
}


// NEW RESEARCH
// ---------------------------------------------------------

function NewResearch({
  query,
  setQuery,
  onStart,
  researching,
  agentProgress,
  activeAgentMessage,
  error,
}: {
  query: string
  setQuery: (v: string) => void
  onStart: () => void
  researching: boolean
  agentProgress: AgentProgressMap
  activeAgentMessage: string
  error: string
}) {
  const examples = [
    {
      title: 'Indian EV market',
      query: 'Analyze the Indian electric vehicle market and identify the major competitors of Tata Motors.',
    },
    {
      title: 'Stripe vs Adyen',
      query: 'Compare Stripe and Adyen growth strategies, market position and competitive strengths.',
    },
    {
      title: 'Sustainable packaging',
      query: 'Find business opportunities and market trends in sustainable packaging.',
    },
  ]

  const remaining = 2000 - query.length
  const hasQuery = Boolean(query.trim())

  return (
    <div className="new-research view-enter">
      <div className="new-intro">
        <span className="eyebrow accent-eyebrow">
          <Sparkles size={13} />
          Research studio
        </span>

        <h2>
          What would you like
          <br />
          <em>to understand?</em>
        </h2>

        <p>
          Ask a complex business question and let the
          multi-agent research system investigate the
          market, companies and competitors.
        </p>
      </div>

      <div className="query-card">
        <div className="query-card-top">
          <span>
            <MessageSquareText size={17} />
            Research brief
          </span>

          <span
            className={`char-count ${
              remaining < 100 ? 'near-limit' : ''
            }`}
          >
            {query.length.toLocaleString()} / 2,000
          </span>
        </div>

        <textarea
          value={query}
          maxLength={2000}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. Analyze the Indian EV market and identify the key competitors of Tata Motors..."
          aria-label="Research question"
        />

        <div className="query-footer">
          <span className="query-hint">
            <Zap size={14} />
            8-agent analysis · research, analysis and review
          </span>

          <button
            className="primary-btn"
            onClick={onStart}
            disabled={!hasQuery || researching}
          >
            {researching ? (
              <>
                <Loader2
                  size={16}
                  className="spin"
                />
                Starting research...
              </>
            ) : (
              <>
                <Play size={16} />
                Start research
              </>
            )}
          </button>
        </div>
      </div>

      {researching && (
        <ResearchProgress
          agentProgress={agentProgress}
          activeAgentMessage={activeAgentMessage}
        />
      )}

      {error && (
        <div className="error-banner">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <div className="examples">
        <div className="examples-heading">
          <span>Try an example</span>
          <small>Click to use</small>
        </div>

        <div className="example-grid">
          {examples.map(example => (
            <button
              key={example.title}
              className="example-card"
              onClick={() => setQuery(example.query)}
              type="button"
            >
              <span className="example-card-copy">
                <strong>{example.title}</strong>
                <span>{example.query}</span>
              </span>

              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      </div>

      <div
        className="research-note"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <CheckCircle2
          size={15}
          style={{
            color: '#22c55e',
            flex: '0 0 auto',
            marginTop: 2,
          }}
        />
        <span style={{ fontSize: 13, lineHeight: 1.5 }}>
          Your question is processed through the Planner,
          research, Analysis, Writer and Reviewer stages.
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// WORKSPACE
// ---------------------------------------------------------

function Workspace({
  query,
  researching,
  agentProgress,
  activeAgentMessage,
}: {
  query: string
  researching: boolean
  agentProgress: AgentProgressMap
  activeAgentMessage: string
}) {
  const statusLabel = (status: AgentExecutionStatus) => {
    if (status === 'running') return 'Running'
    if (status === 'completed') return 'Completed'
    if (status === 'error') return 'Error'
    return 'Waiting'
  }

  const executedAgents = agents.filter(
    agent => agentProgress[agent.name]?.status !== 'waiting'
  )

  const completedCount = agents.filter(
    agent => agentProgress[agent.name]?.status === 'completed'
  ).length

  const runningCount = agents.filter(
    agent => agentProgress[agent.name]?.status === 'running'
  ).length

  const detailByAgent: Record<string, {
    role: string
    what: string
    output: string
  }> = {
    'Planner Agent': {
      role: 'Research planning',
      what: 'Breaks the business question into focused research tasks and defines what information each research stream needs.',
      output: 'Creates the execution plan for market, company, competitor and business insight research.',
    },
    'Market Agent': {
      role: 'Market intelligence',
      what: 'Investigates the market environment, demand, trends, growth signals, customer needs and important industry developments.',
      output: 'Collects market evidence that helps explain market direction and demand.',
    },
    'Company Agent': {
      role: 'Company intelligence',
      what: 'Studies the target company, its products, positioning, business direction and relevant strategic context.',
      output: 'Builds a company-focused evidence base for the final analysis.',
    },
    'Competitor Agent': {
      role: 'Competitive intelligence',
      what: 'Identifies important competitors and examines their positioning, differentiation, strengths, threats and market gaps.',
      output: 'Creates the competitive landscape needed for comparison and opportunity analysis.',
    },
    'Analysis Agent': {
      role: 'Business analysis',
      what: 'Combines market, company and competitor findings to identify patterns, opportunities, risks and meaningful business insights.',
      output: 'Turns collected evidence into decision-ready business interpretation.',
    },
    'Writer Agent': {
      role: 'Report generation',
      what: 'Organizes the analysis into a structured business research report with clear sections, findings and sources.',
      output: 'Produces the first complete business research report draft.',
    },
    'Reviewer Agent': {
      role: 'Quality review',
      what: 'Checks the report for evidence quality, completeness, clarity, consistency, repetition and alignment with the research question.',
      output: 'Validates the report and identifies anything that needs correction or improvement.',
    },
    'Final Report Agent': {
      role: 'Final delivery',
      what: 'Applies the reviewed result and prepares the final business research report for the user.',
      output: 'Delivers the final reviewed report and makes it ready to open.',
    },
  }

  const researchAgents = agents.filter(agent =>
    ['Market Agent', 'Company Agent', 'Competitor Agent'].includes(agent.name)
  )

  const firstAgent = agents.find(agent => agent.name === 'Planner Agent')

  const finalAgents = agents.filter(agent =>
    ['Analysis Agent', 'Writer Agent', 'Reviewer Agent', 'Final Report Agent'].includes(agent.name)
  )

  const renderAgentCard = (agent: typeof agents[number]) => {
    const progress = agentProgress[agent.name]
    const status = progress?.status || 'waiting'
    const details = detailByAgent[agent.name]
    const Icon = agent.icon

    return (
      <article className={`business-agent-card ${status}`}>
        <div className="business-agent-card-top">
          <span className="business-agent-icon">
            <Icon size={18} />
          </span>

          <div className="business-agent-heading">
            <div className="business-agent-name-row">
              <strong>{agent.name}</strong>
              <span className={`business-agent-status ${status}`}>
                <span className="dot" />
                {statusLabel(status)}
              </span>
            </div>
            <span className="business-agent-role">
              {details?.role || agent.description}
            </span>
          </div>
        </div>

        <div className="business-agent-detail">
          <span className="business-detail-label">What this agent does</span>
          <p>{details?.what || agent.description}</p>
        </div>

        {status !== 'waiting' && (
          <div className="business-agent-update">
            <span className="business-detail-label">Execution update</span>
            <p>
              {progress?.message || details?.output || activeAgentMessage}
            </p>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="view-enter activity-page business-activity-page">
      <style jsx global>{`
        .business-activity-page {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 0 56px;
        }

        .business-objective {
          margin: 18px 0 16px;
          padding: 17px 20px;
          border: 1px solid rgba(127, 127, 127, 0.18);
          border-radius: 18px;
          background: var(--card-bg, #15171d);
        }

        .business-objective-label,
        .business-detail-label {
          display: block;
          margin-bottom: 7px;
          color: #8995ad;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .business-objective p {
          margin: 0;
          color: var(--text-primary, #eef2f8);
          font-size: 14px;
          line-height: 1.55;
          word-break: break-word;
        }

        .business-run-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 16px;
          color: #8d99b0;
          font-size: 12px;
        }

        .business-run-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(34,197,94,.16);
          background: rgba(34,197,94,.09);
          color: #2bd86f;
          font-weight: 800;
          white-space: nowrap;
        }

        .business-run-pill .dot,
        .business-agent-status .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          flex: 0 0 auto;
        }

        .business-activity-card {
          border: 1px solid rgba(127,127,127,.18);
          border-radius: 20px;
          background: var(--card-bg, #15171d);
          overflow: hidden;
        }

        .business-activity-heading {
          padding: 20px 22px 17px;
          border-bottom: 1px solid rgba(127,127,127,.13);
        }

        .business-activity-heading h3 {
          margin: 0;
          color: var(--text-primary, #f4f6fa);
          font-size: 21px;
          line-height: 1.2;
          letter-spacing: -.025em;
        }

        .business-activity-heading p {
          margin: 7px 0 0;
          color: #8d99b0;
          font-size: 13px;
          line-height: 1.5;
        }

        .business-agent-list {
          position: relative;
          padding: 17px 22px 25px;
        }

        .business-agent-list::before {
          content: '';
          position: absolute;
          left: 42px;
          top: 39px;
          bottom: 39px;
          width: 1px;
          background: rgba(126,118,255,.24);
        }

        .business-sequential-wrap {
          position: relative;
          z-index: 1;
        }

        .business-agent-card {
          position: relative;
          margin: 0 0 13px;
          padding: 15px 16px 16px 0;
          border: 0;
          background: transparent;
          color: inherit;
          transition: transform .2s ease;
        }

        .business-agent-card:last-child {
          margin-bottom: 0;
        }

        .business-agent-card-top {
          display: grid;
          grid-template-columns: 42px minmax(0,1fr);
          gap: 14px;
          align-items: start;
        }

        .business-agent-icon {
          position: relative;
          z-index: 2;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #9897ff;
          background: #23263d;
          border: 1px solid rgba(143,140,255,.13);
          box-shadow: 0 0 0 7px var(--card-bg, #15171d);
        }

        .business-agent-card.completed .business-agent-icon {
          color: #28d66c;
          background: rgba(34,197,94,.12);
        }

        .business-agent-card.error .business-agent-icon {
          color: #ff7070;
          background: rgba(239,68,68,.12);
        }

        .business-agent-card.running .business-agent-icon {
          animation: businessAgentPulse 1.4s ease-in-out infinite;
        }

        @keyframes businessAgentPulse {
          0%,100% { box-shadow: 0 0 0 7px var(--card-bg, #15171d); }
          50% { box-shadow: 0 0 0 7px var(--card-bg, #15171d), 0 0 0 10px rgba(126,118,255,.08); }
        }

        .business-agent-heading {
          min-width: 0;
          padding-top: 1px;
        }

        .business-agent-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .business-agent-name-row strong {
          color: var(--text-primary, #f2f4f8);
          font-size: 16px;
          line-height: 1.3;
        }

        .business-agent-role {
          display: block;
          margin-top: 4px;
          color: #8e9ab0;
          font-size: 12px;
          line-height: 1.4;
        }

        .business-agent-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(126,118,255,.09);
          color: #aaa7ff;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .business-agent-status.completed {
          background: rgba(34,197,94,.10);
          color: #29d66c;
        }

        .business-agent-status.error {
          background: rgba(239,68,68,.10);
          color: #ff7777;
        }

        .business-agent-detail,
        .business-agent-update {
          margin: 9px 0 0 56px;
          padding: 11px 13px;
          border: 1px solid rgba(127,127,127,.12);
          border-radius: 12px;
          background: rgba(255,255,255,.018);
        }

        .business-agent-detail p,
        .business-agent-update p {
          margin: 0;
          color: #c4cad6;
          font-size: 12px;
          line-height: 1.55;
        }

        .business-agent-update {
          margin-top: 7px;
          border-color: rgba(126,118,255,.12);
          background: rgba(126,118,255,.035);
        }

        .business-agent-update .business-detail-label {
          color: #9c99ff;
        }

        .business-parallel-label {
          position: relative;
          z-index: 2;
          margin: 14px 0 10px 56px;
          color: #858fa7;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .business-parallel {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 10px;
          margin-left: 56px;
        }

        .business-parallel .business-agent-card {
          margin: 0;
          padding: 15px;
          border: 1px solid rgba(127,127,127,.15);
          border-radius: 16px;
          background: rgba(255,255,255,.018);
        }

        .business-parallel .business-agent-card-top {
          grid-template-columns: 38px minmax(0,1fr);
          gap: 10px;
        }

        .business-parallel .business-agent-icon {
          width: 38px;
          height: 38px;
          box-shadow: none;
          border-radius: 11px;
        }

        .business-parallel .business-agent-name-row {
          display: block;
        }

        .business-parallel .business-agent-status {
          margin-top: 7px;
        }

        .business-parallel .business-agent-detail,
        .business-parallel .business-agent-update {
          margin-left: 48px;
        }

        .business-final-report-ready {
          margin-top: 15px;
          padding: 15px 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid rgba(34,197,94,.18);
          border-radius: 16px;
          background: rgba(34,197,94,.055);
        }

        .business-final-report-kicker {
          display: block;
          margin-bottom: 4px;
          color: #29d66c;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .business-final-report-ready strong {
          color: var(--text-primary, #eef2f8);
          font-size: 13px;
        }

        .business-final-report-ready button {
          border: 0;
          border-radius: 10px;
          padding: 9px 12px;
          background: #7671f7;
          color: white;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .business-empty-state {
          padding: 32px 10px;
          text-align: center;
          color: #8d99b0;
          font-size: 13px;
        }

        html.light .business-activity-card,
        html.light .business-objective {
          background: #ffffff;
          border-color: rgba(20,30,50,.11);
          box-shadow: 0 10px 30px rgba(25,35,55,.055);
        }

        html.light .business-agent-list::before {
          background: rgba(88,80,220,.20);
        }

        html.light .business-agent-icon {
          background: #f0f1ff;
          border-color: rgba(88,80,220,.10);
          box-shadow: 0 0 0 7px #fff;
        }

        html.light .business-agent-card.completed .business-agent-icon {
          background: #eafaf0;
        }

        html.light .business-agent-card.error .business-agent-icon {
          background: #fff0f0;
        }

        html.light .business-agent-detail,
        html.light .business-agent-update,
        html.light .business-parallel .business-agent-card {
          background: #f8f9fc;
          border-color: rgba(20,30,50,.09);
        }

        html.light .business-agent-name-row strong,
        html.light .business-objective p,
        html.light .business-final-report-ready strong {
          color: #182033;
        }

        html.light .business-agent-detail p,
        html.light .business-agent-update p {
          color: #536078;
        }

        @media (max-width: 820px) {
          .business-parallel {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .business-activity-page {
            padding-bottom: 30px;
          }

          .business-objective {
            margin-top: 12px;
            padding: 14px;
            border-radius: 15px;
          }

          .business-activity-heading {
            padding: 17px 15px 14px;
          }

          .business-agent-list {
            padding: 13px 12px 19px;
          }

          .business-agent-list::before {
            left: 32px;
            top: 34px;
            bottom: 34px;
          }

          .business-agent-card-top {
            grid-template-columns: 34px minmax(0,1fr);
            gap: 11px;
          }

          .business-agent-icon {
            width: 34px;
            height: 34px;
            box-shadow: 0 0 0 6px var(--card-bg, #15171d);
          }

          html.light .business-agent-icon {
            box-shadow: 0 0 0 6px #fff;
          }

          .business-agent-name-row strong {
            font-size: 15px;
          }

          .business-agent-detail,
          .business-agent-update {
            margin-left: 45px;
            padding: 10px 11px;
          }

          .business-parallel-label {
            margin-left: 45px;
          }

          .business-parallel {
            margin-left: 45px;
          }

          .business-parallel .business-agent-detail,
          .business-parallel .business-agent-update {
            margin-left: 0;
          }

          .business-final-report-ready {
            align-items: flex-start;
            flex-direction: column;
          }

          .business-final-report-ready button {
            width: 100%;
          }
        }

        @media (max-width: 390px) {
          .business-agent-status {
            font-size: 9px;
            padding: 4px 7px;
          }

          .business-agent-role,
          .business-agent-detail p,
          .business-agent-update p {
            font-size: 11px;
          }
        }
      `}</style>

      <div className="business-objective">
        <span className="business-objective-label">Research objective</span>
        <p>{query || 'Your business research request will appear here.'}</p>
      </div>

      <div className="business-run-summary">
        <span>
          {researching
            ? 'Agents are working on your business research...'
            : executedAgents.length
              ? `${completedCount} of ${agents.length} business agents completed`
              : 'Waiting to start the business research workflow'}
        </span>

        <span className="business-run-pill">
          <span className="dot" />
          {runningCount > 0 ? `${runningCount} running` : 'System online'}
        </span>
      </div>

      <section className="business-activity-card">
        <div className="business-activity-heading">
          <h3>Agent Activity</h3>
          <p>
            Each agent shows exactly what it is responsible for and what it
            actually did during this business research run.
          </p>
        </div>

        {executedAgents.length === 0 ? (
          <div className="business-empty-state">
            Start a research request to see the business agents working live.
          </div>
        ) : (
          <div className="business-agent-list">
            <div className="business-sequential-wrap">
              {firstAgent &&
                executedAgents.some(item => item.name === firstAgent.name) &&
                renderAgentCard(firstAgent)}
            </div>

            {researchAgents.some(agent =>
              executedAgents.some(item => item.name === agent.name)
            ) && (
              <>
                <div className="business-parallel-label">
                  Parallel business intelligence
                </div>

                <div className="business-parallel">
                  {researchAgents
                    .filter(agent =>
                      executedAgents.some(item => item.name === agent.name)
                    )
                    .map(renderAgentCard)}
                </div>

                <div className="business-sequential-wrap business-final-agents">
                  {finalAgents
                    .filter(agent =>
                      executedAgents.some(item => item.name === agent.name)
                    )
                    .map(renderAgentCard)}
                </div>
              </>
            )}

            {!researchAgents.some(agent =>
              executedAgents.some(item => item.name === agent.name)
            ) && (
              <div className="business-sequential-wrap business-final-agents">
                {finalAgents
                  .filter(agent =>
                    executedAgents.some(item => item.name === agent.name)
                  )
                  .map(renderAgentCard)}
              </div>
            )}
          </div>
        )}
      </section>

      {agentProgress['Final Report Agent']?.status === 'completed' && (
        <section className="business-final-report-ready">
          <div>
            <span className="business-final-report-kicker">
              Final report ready
            </span>
            <strong>Your reviewed business research report is ready.</strong>
          </div>
          <span style={{ color: '#29d66c', fontSize: 12, fontWeight: 800 }}>
            Opening report…
          </span>
        </section>
      )}
    </div>
  )
}


// ---------------------------------------------------------
// REPORTS
// ---------------------------------------------------------

function Reports({
  reports,
  selectedReport,
  setSelectedReport,
  onRename,
  onDelete,
}: {
  reports: Report[]
  selectedReport: Report | null
  setSelectedReport: (
    r: Report | null
  ) => void
  onRename: (
    id: string,
    title: string
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}) {

  // Short message shown above the grid (rename/delete problems).
  const [notice, setNotice] =
    useState('')

  useEffect(() => {
    if (!notice) return

    const timer = window.setTimeout(
      () => setNotice(''),
      4500
    )

    return () => window.clearTimeout(timer)
  }, [notice])

  if (!selectedReport) {

    return (
      <div className="view-enter">

        <div className="page-intro">

          <div>

            <span className="eyebrow accent-eyebrow">
              <FileBarChart size={13} />
              Knowledge base
            </span>

            <h2>
              Your reports
            </h2>

            <p>
              Read, revisit and share the
              intelligence your agents have
              discovered.
            </p>

          </div>


        </div>


        {notice && (
          <div className="error-banner">
            <AlertCircle size={17} />
            {notice}
          </div>
        )}


        {reports.length ? (

          <div className="report-grid">

            {reports.map(
              (report, i) => (

                <ReportTile
                  key={
                    report.id || i
                  }
                  report={report}
                  onOpen={() =>
                    setSelectedReport(
                      report
                    )
                  }
                  onRename={onRename}
                  onDelete={onDelete}
                  onNotice={setNotice}
                />

              )
            )}

          </div>

        ) : (

          <EmptyState
            title="No reports available"
            description="Complete a research brief to create your first report."
          />

        )}

      </div>
    )
  }


  return (
    <ReportViewer
      report={selectedReport}
      onBack={() =>
        setSelectedReport(null)
      }
    />
  )
}


// ---------------------------------------------------------
// REPORT TILE (with working 3-dot menu: Edit / Delete)
// ---------------------------------------------------------

function ReportTile({
  report,
  onOpen,
  onRename,
  onDelete,
  onNotice,
}: {
  report: Report
  onOpen: () => void
  onRename: (
    id: string,
    title: string
  ) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onNotice: (message: string) => void
}) {

  const [menuOpen, setMenuOpen] =
    useState(false)

  const [editing, setEditing] =
    useState(false)

  const [draft, setDraft] =
    useState('')

  const [busy, setBusy] =
    useState(false)

  const wrapRef =
    useRef<HTMLDivElement | null>(null)

  const reportId = String(
    report.id ??
    (report as any).report_id ??
    ''
  )

  const title =
    report.user_query ||
    report.query ||
    'Untitled research'

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return

    const handleMouseDown = (event: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const startEdit = () => {
    setMenuOpen(false)

    if (!reportId) {
      onNotice('This report has no ID, so it cannot be edited.')
      return
    }

    setDraft(
      title === 'Untitled research' ? '' : title
    )
    setEditing(true)
  }

  const saveEdit = async () => {
    if (busy) return

    const next = draft.trim()

    if (!next) {
      onNotice('The title cannot be empty.')
      return
    }

    if (next === title) {
      setEditing(false)
      return
    }

    setBusy(true)
    const saved = await onRename(reportId, next)
    setBusy(false)
    setEditing(false)

    if (!saved) {
      onNotice(
        'Renamed on screen, but the change could not be saved to the server.'
      )
    }
  }

  const handleDelete = async () => {
    setMenuOpen(false)

    if (!reportId) {
      onNotice('This report has no ID, so it cannot be deleted.')
      return
    }

    if (
      !window.confirm(
        'Delete this report? This cannot be undone.'
      )
    ) {
      return
    }

    const deleted = await onDelete(reportId)

    if (!deleted) {
      onNotice(
        'Unable to delete this report. Please try again.'
      )
    }
  }

  if (editing) {
    return (
      <div
        className="report-tile"
        style={{ cursor: 'default' }}
      >

        <div className="report-tile-top">

          <span className="row-icon">
            <FileText size={17} />
          </span>

        </div>

        <input
          autoFocus
          value={draft}
          maxLength={1000}
          aria-label="Report title"
          onChange={event =>
            setDraft(event.target.value)
          }
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void saveEdit()
            }

            if (event.key === 'Escape') {
              setEditing(false)
            }
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '9px 11px',
            marginTop: 14,
            border: '1px solid rgba(127, 127, 127, 0.4)',
            borderRadius: 8,
            background: 'rgba(127, 127, 127, 0.10)',
            color: 'inherit',
            font: 'inherit',
            fontSize: 14,
            outline: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
          }}
        >

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveEdit()}
            style={{
              padding: '7px 14px',
              border: 0,
              borderRadius: 8,
              background: '#6d5efc',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Saving...' : 'Save'}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(false)}
            style={{
              padding: '7px 14px',
              border: '1px solid rgba(127, 127, 127, 0.35)',
              borderRadius: 8,
              background: 'transparent',
              color: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

        </div>

      </div>
    )
  }

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        display: 'flex',
        zIndex: menuOpen ? 30 : 1,
      }}
    >

      <button
        type="button"
        className="report-tile"
        style={{ flex: 1, minWidth: 0 }}
        onClick={onOpen}
      >

        <div className="report-tile-top">

          <span className="row-icon">
            <FileText size={17} />
          </span>

        </div>

        <h3>
          {title}
        </h3>

        <p>
          {formatReportDate(report.created_at)}
        </p>

        <span className="report-tile-link">

          Open report

          <ArrowUpRight size={14} />

        </span>

      </button>


      <div
        style={{
          position: 'absolute',
          top: 22,
          right: 20,
        }}
      >

        <button
          type="button"
          className="row-more"
          title="More actions"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{ cursor: 'pointer' }}
          onClick={event => {
            event.stopPropagation()
            setMenuOpen(current => !current)
          }}
        >
          <MoreHorizontal size={17} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              zIndex: 50,
              minWidth: 145,
              padding: 5,
              border: '1px solid rgba(127, 127, 127, 0.22)',
              borderRadius: 10,
              background: '#111722',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
            }}
          >

            <button
              type="button"
              role="menuitem"
              style={{
                display: 'block',
                width: '100%',
                border: 0,
                borderRadius: 7,
                background: 'transparent',
                color: 'inherit',
                padding: '8px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 12,
              }}
              onClick={startEdit}
            >
              Edit
            </button>

            <button
              type="button"
              role="menuitem"
              style={{
                display: 'block',
                width: '100%',
                border: 0,
                borderRadius: 7,
                background: 'transparent',
                color: '#ff7777',
                padding: '8px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 12,
              }}
              onClick={() => void handleDelete()}
            >
              Delete
            </button>

          </div>
        )}

      </div>

    </div>
  )
}


// ---------------------------------------------------------
// REPORT VIEWER
// ---------------------------------------------------------

const REPORT_SECTIONS = [
  {
    key: 'executive-summary',
    label: 'Executive summary',
  },
  {
    key: 'market-overview',
    label: 'Market overview',
  },
  {
    key: 'company-analysis',
    label: 'Company analysis',
  },
  {
    key: 'competitor-analysis',
    label: 'Competitor analysis',
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
  },
  {
    key: 'challenges',
    label: 'Challenges',
  },
  {
    key: 'key-insights',
    label: 'Key insights',
  },
  {
    key: 'conclusion',
    label: 'Conclusion',
  },
  {
    key: 'sources',
    label: 'Sources',
  },
]


// ---------------------------------------------------------
// REPORT SECTION PARSER
// ---------------------------------------------------------

function parseReportSections(content: string) {

  // The backend returns the final report as markdown/plain text.
  // This parser recognizes markdown headings and known bold headings.
  const lines = content.split(/\r?\n/)

  const sections: {
    title: string
    content: string
  }[] = []

  let currentTitle = 'Executive summary'
  let currentContent: string[] = []

  const saveCurrentSection = () => {
    const text = currentContent.join('\n').trim()

    if (text) {
      sections.push({
        title: currentTitle.trim(),
        content: text,
      })
    }
  }

  const normalize = (value: string) =>
    value
      .replace(/[*_`]/g, '')
      .replace(/^\d+[.)\-:]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const isKnownSection = (title: string) => {
    // Use the same alias-aware key mapping as the renderer.
    // This allows headings such as "Executive Brief",
    // "Competitive Comparison", and "Risks and Recent Developments"
    // to connect to the matching sidebar item.
    return Boolean(getSectionKey(title))
  }

  for (const line of lines) {

    const markdownHeading =
      line.match(/^#{1,6}\s+(.+?)\s*$/)

    if (markdownHeading) {
      const title = markdownHeading[1]

      if (isKnownSection(title)) {
        saveCurrentSection()
        currentTitle = title
        currentContent = []
        continue
      }
    }

    const boldHeading =
      line.match(/^\*\*(.+?)\*\*\s*$/)

    if (boldHeading && isKnownSection(boldHeading[1])) {
      saveCurrentSection()
      currentTitle = boldHeading[1]
      currentContent = []
      continue
    }

    // Support numbered headings such as:
    // 01 Executive Summary
    // 02 Market Overview
    const numberedHeading =
      line.match(/^\s*\d{1,2}[.)\-:]\s+(.+?)\s*$/)

    if (
      numberedHeading &&
      isKnownSection(numberedHeading[1])
    ) {
      saveCurrentSection()
      currentTitle = numberedHeading[1]
      currentContent = []
      continue
    }

    currentContent.push(line)
  }

  saveCurrentSection()

  return sections
}


// ---------------------------------------------------------
// SECTION KEY HELPER
// ---------------------------------------------------------

function getSectionKey(title: string) {

  const normalized =
    title
      .replace(/[*_`]/g, '')
      .replace(/^\s*\d{1,2}[.)\-:]\s*/, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  // Executive section aliases used by the writer agent.
  if (
    normalized.includes('executive') ||
    normalized === 'summary' ||
    normalized.includes('executive brief')
  ) {
    return 'executive-summary'
  }

  // Market section aliases.
  if (
    normalized === 'market overview' ||
    normalized.includes('market size') ||
    normalized.includes('market trend') ||
    normalized.includes('market driver') ||
    normalized.includes('customer demand')
  ) {
    return 'market-overview'
  }

  // Company section aliases.
  if (
    normalized.includes('company') ||
    normalized.includes('company and competitive landscape')
  ) {
    return 'company-analysis'
  }

  // Competitor section aliases. "Competitive" is intentionally included
  // because reports often use "Competitive Comparison" rather than
  // the exact phrase "Competitor Analysis".
  if (
    normalized.includes('competitor') ||
    normalized.includes('competitive comparison') ||
    normalized.includes('competitive landscape')
  ) {
    return 'competitor-analysis'
  }

  // Opportunity aliases.
  if (
    normalized.includes('opportun') ||
    normalized.includes('market gap') ||
    normalized.includes('white space')
  ) {
    return 'opportunities'
  }

  // Challenge/risk aliases.
  if (
    normalized.includes('challenge') ||
    normalized.includes('risk') ||
    normalized.includes('recent development')
  ) {
    return 'challenges'
  }

  if (
    normalized.includes('insight') ||
    normalized.includes('key takeaway')
  ) {
    return 'key-insights'
  }

  if (normalized.includes('conclusion')) {
    return 'conclusion'
  }

  if (normalized.includes('source') || normalized.includes('references')) {
    return 'sources'
  }

  return null
}


// ---------------------------------------------------------
// REPORT CONTENT FALLBACK
// ---------------------------------------------------------

function getReportContent(report: Report) {
  return (
    report.content ||
    report.final_report ||
    'No report content available.'
  )
}


// ---------------------------------------------------------
// REPORT VIEWER
// ---------------------------------------------------------


// ---------------------------------------------------------
// REPORT MARKDOWN NORMALIZATION + RENDERING
// ---------------------------------------------------------

// Rupee amounts: Rs 1200000 / INR 12,00,000 / Rs. 5000 -> ₹12,00,000 (Indian grouping).
// $, EUR and GBP amounts are intentionally left untouched.
function groupIndian(num: string) {
  const [int, dec] = num.replace(/,/g, '').split('.')
  let out = int
  if (int.length > 3) {
    out = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + int.slice(-3)
  }
  return dec !== undefined ? `${out}.${dec}` : out
}

function formatRupeeAmounts(text: string) {
  return text.replace(
    /(?:₹|\bRs\.?|\bINR)\s*(\d+(?:,\d+)*(?:\.\d+)?)/g,
    (_m, num: string) => `₹${groupIndian(num)}`
  )
}

function normalizeReportContent(content: string) {
  return formatRupeeAmounts(normalizeReportEscapes(content))
}

function normalizeReportEscapes(content: string) {
  return content
    .replace(/\\u2014/g, String.fromCharCode(0x2014))
    .replace(/\\u2013/g, String.fromCharCode(0x2013))
    .replace(/\\u2019/g, String.fromCharCode(0x2019))
    .replace(/\\u2018/g, String.fromCharCode(0x2018))
    .replace(/\\u201c/g, String.fromCharCode(0x201c))
    .replace(/\\u201d/g, String.fromCharCode(0x201d))
    .replace(/\\\#/g, '#')
    .replace(/\\\*/g, '*')
    .replace(/\\_/g, '_')
    .replace(/\\-/g, '-')
    .replace(/\\\+/g, '+')
    .replace(/\\\./g, '.')
    .replace(/\\:/g, ':')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\\|/g, '|')
    .replace(/\\~/g, '~')
    .replace(/\\!/g, '!')
    .replace(/\\:\/\//g, '://')
    .replace(/\\\//g, '/')
    .replace(/\\\\/g, '\\')
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function inlineMarkdown(value: string) {
  let html = escapeHtml(value)

  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  )

  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  )

  html = html.replace(
    /__([^_]+)__/g,
    '<strong>$1</strong>'
  )

  html = html.replace(
    /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
    '<em>$1</em>'
  )

  html = html.replace(
    /`([^`]+)`/g,
    '<code>$1</code>'
  )

  html = html.replace(
    /(^|\s)(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>'
  )

  return html
}

function MarkdownBlock({ text }: { text: string }) {
  const normalized = normalizeReportContent(text)
  const lines = normalized.split(/\r?\n/)
  const isTable = lines.length >= 2 &&
    lines.some(line => /^\s*\|.*\|\s*$/.test(line)) &&
    lines.some(line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line))

  if (isTable) {
    const tableLines = lines.filter(line => line.trim())
    const header = tableLines[0]
      .split('|')
      .map(cell => cell.trim())
      .filter(Boolean)
    const rows = tableLines
      .slice(2)
      .map(line =>
        line
          .split('|')
          .map(cell => cell.trim())
          .filter(Boolean)
      )

    return (
      <div className="report-markdown-table-wrap">
        <table className="report-markdown-table">
          <thead>
            <tr>
              {header.map((cell, index) => (
                <th
                  key={index}
                  dangerouslySetInnerHTML={{
                    __html: inlineMarkdown(cell),
                  }}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {header.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    dangerouslySetInnerHTML={{
                      __html: inlineMarkdown(row[cellIndex] || ''),
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const html = lines
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^(-{3,}|\*{3,}|_{3,})$/.test(line))
    .map(line => {
      if (/^[-*+]\s+/.test(line)) {
        return `<li>${inlineMarkdown(line.replace(/^[-*+]\s+/, ''))}</li>`
      }

      if (/^\d+[.)]\s+/.test(line)) {
        return `<li>${inlineMarkdown(line.replace(/^\d+[.)]\s+/, ''))}</li>`
      }

      return `<p>${inlineMarkdown(line)}</p>`
    })
    .join('')
    .replace(/(<li>.*?<\/li>)+/gs, match => `<ul>${match}</ul>`)

  return (
    <div
      className="report-markdown-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}


// ---------------------------------------------------------
// PDF EXPORT (no external library needed)
// ---------------------------------------------------------

// Helvetica glyph widths (1/1000 em) for ASCII 32..126.
const PDF_WIDTHS_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]

const PDF_WIDTHS_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

// Widths of a few extra WinAnsi characters: [regular, bold].
const PDF_SPECIAL_WIDTHS: Record<number, [number, number]> = {
  0x85: [1000, 1000],
  0x91: [222, 278],
  0x92: [222, 278],
  0x93: [333, 500],
  0x94: [333, 500],
  0x95: [350, 350],
  0x96: [556, 556],
  0x97: [1000, 1000],
  0xa0: [278, 278],
}

// Unicode characters that exist in the PDF's WinAnsi font encoding.
const PDF_UNICODE_TO_WINANSI: Record<string, number> = {
  '\u20ac': 0x80,
  '\u2026': 0x85,
  '\u2018': 0x91,
  '\u2019': 0x92,
  '\u201c': 0x93,
  '\u201d': 0x94,
  '\u2022': 0x95,
  '\u2013': 0x96,
  '\u2014': 0x97,
  '\u2122': 0x99,
}

// Characters the standard PDF font cannot draw get a readable stand-in.
const PDF_TEXT_REPLACEMENTS: Record<string, string> = {
  '\u20b9': 'Rs ',
  '\u2192': '->',
  '\u2190': '<-',
  '\u2265': '>=',
  '\u2264': '<=',
  '\u2248': '~',
  '\u2713': 'v',
  '\u2714': 'v',
  '\u2011': '-',
  '\u2212': '-',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2009': ' ',
  '\u200a': ' ',
  '\u202f': ' ',
  '\u200b': '',
  '\u200d': '',
  '\ufe0f': '',
}

// Converts text to a "binary string" where every character is one
// WinAnsi byte (0-255), which is what the PDF font expects.
function pdfEncode(text: string): string {
  let out = ''

  for (const ch of Array.from(text)) {
    const code = ch.codePointAt(0) as number

    if (code === 9) {
      out += '    '
      continue
    }

    if (code < 32 || (code >= 127 && code < 160)) {
      continue
    }

    if (code < 127) {
      out += ch
      continue
    }

    if (PDF_UNICODE_TO_WINANSI[ch] !== undefined) {
      out += String.fromCharCode(PDF_UNICODE_TO_WINANSI[ch])
      continue
    }

    if (PDF_TEXT_REPLACEMENTS[ch] !== undefined) {
      out += PDF_TEXT_REPLACEMENTS[ch]
      continue
    }

    if (code === 0xa0) {
      out += ' '
      continue
    }

    if (code >= 0xa1 && code <= 0xff) {
      out += ch
      continue
    }

    // Emoji and symbols the font cannot show are dropped.
    if (code >= 0x1f000) {
      continue
    }

    out += '?'
  }

  return out
}

function pdfCharWidth(code: number, bold: boolean): number {
  if (code >= 32 && code <= 126) {
    return (bold ? PDF_WIDTHS_BOLD : PDF_WIDTHS_REGULAR)[code - 32]
  }

  const special = PDF_SPECIAL_WIDTHS[code]

  if (special) {
    return special[bold ? 1 : 0]
  }

  return 556
}

function pdfTextWidth(
  encoded: string,
  size: number,
  bold: boolean
): number {
  let units = 0

  for (let i = 0; i < encoded.length; i++) {
    units += pdfCharWidth(encoded.charCodeAt(i), bold)
  }

  return (units * size) / 1000
}

// Escapes a string for use inside a PDF literal string ( ... ).
function pdfEscape(encoded: string): string {
  return encoded
    .replace(/[\\()]/g, match => '\\' + match)
    .replace(/[^\x20-\x7e]/g, char =>
      '\\' + char.charCodeAt(0).toString(8).padStart(3, '0')
    )
}

// Splits text into lines that fit inside maxWidth.
function pdfWrap(
  encoded: string,
  size: number,
  bold: boolean,
  maxWidth: number
): string[] {
  const lines: string[] = []
  let current = ''

  const words = encoded
    .split(' ')
    .filter(word => word.length > 0)

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word

    if (pdfTextWidth(candidate, size, bold) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
      current = ''
    }

    if (pdfTextWidth(word, size, bold) <= maxWidth) {
      current = word
      continue
    }

    // A single very long word (for example a URL): break it by characters.
    let chunk = ''

    for (let i = 0; i < word.length; i++) {
      const next = chunk + word[i]

      if (
        chunk &&
        pdfTextWidth(next, size, bold) > maxWidth
      ) {
        lines.push(chunk)
        chunk = word[i]
      } else {
        chunk = next
      }
    }

    current = chunk
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

// Removes markdown symbols so the PDF shows clean text.
function pdfCleanInline(value: string): string {
  return value
    .replace(/^>\s*/, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*/g, '')
    .trim()
}

// Builds a real PDF file (A4, Helvetica, automatic page breaks and
// page numbers) from the report title, a meta line and markdown text.
function buildReportPdf(
  title: string,
  meta: string,
  content: string
): Blob {

  const PAGE_W = 595.28
  const PAGE_H = 841.89
  const MARGIN = 56
  const BOTTOM = 70
  const TEXT_W = PAGE_W - MARGIN * 2
  const MARKER_W = 18

  const pages: string[][] = [[]]
  let y = PAGE_H - MARGIN
  let gap = 0

  const newPage = () => {
    pages.push([])
    y = PAGE_H - MARGIN
  }

  const ensure = (height: number) => {
    if (y - height < BOTTOM) {
      newPage()
    }
  }

  const drawText = (
    encoded: string,
    x: number,
    size: number,
    bold: boolean,
    gray: number
  ) => {
    pages[pages.length - 1].push(
      `${gray} g BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(encoded)}) Tj ET`
    )
  }

  const drawRule = () => {
    ensure(14)
    y -= 6
    pages[pages.length - 1].push(
      `0.82 g ${MARGIN} ${y.toFixed(2)} ${TEXT_W.toFixed(2)} 0.7 re f`
    )
    y -= 8
  }

  const block = (
    text: string,
    options: {
      size: number
      bold?: boolean
      gray?: number
      indent?: number
      marker?: string
      before?: number
      after?: number
      keepNext?: boolean
    }
  ) => {
    const size = options.size
    const bold = Boolean(options.bold)
    const gray = options.gray ?? 0.12
    const indent = options.indent ?? 0
    const markerWidth = options.marker ? MARKER_W : 0
    const lineHeight = size * 1.4

    const lines = pdfWrap(
      pdfEncode(text),
      size,
      bold,
      TEXT_W - indent - markerWidth
    )

    if (!lines.length) {
      return
    }

    const before = Math.max(options.before ?? 0, gap)
    gap = 0

    if (before && y < PAGE_H - MARGIN) {
      y -= before
    }

    // Headings stay together with the text that follows them.
    ensure(lineHeight + (options.keepNext ? 36 : 0))

    lines.forEach((line, index) => {
      ensure(lineHeight)
      y -= lineHeight

      if (index === 0 && options.marker) {
        drawText(
          pdfEncode(options.marker),
          MARGIN + indent,
          size,
          bold,
          gray
        )
      }

      drawText(
        line,
        MARGIN + indent + markerWidth,
        size,
        bold,
        gray
      )
    })

    y -= options.after ?? 4
  }

  // ---------- title block ----------

  block(title || 'Research report', {
    size: 18,
    bold: true,
    after: 6,
  })

  block(meta, {
    size: 9,
    gray: 0.4,
    after: 2,
  })

  drawRule()

  // ---------- report body ----------

  let tableRow = 0

  for (const rawLine of content.replace(/\r\n?/g, '\n').split('\n')) {

    const line = rawLine.replace(/\s+$/, '')
    const trimmed = line.trim()

    if (!trimmed) {
      tableRow = 0
      gap = 6
      continue
    }

    // Markdown table row
    if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed
        .replace(/^\||\|$/g, '')
        .split('|')
        .map(cell => pdfCleanInline(cell.trim()))

      if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) {
        continue
      }

      block(cells.join('  |  '), {
        size: 9.5,
        bold: tableRow === 0,
        before: tableRow === 0 ? 6 : 0,
        after: 3,
      })

      tableRow += 1
      continue
    }

    tableRow = 0

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/)

    if (heading) {
      const level = heading[1].length
      const size =
        level === 1 ? 16 : level === 2 ? 14 : level === 3 ? 12 : 11

      block(pdfCleanInline(heading[2]), {
        size,
        bold: true,
        before: 12,
        after: 4,
        keepNext: true,
      })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      drawRule()
      continue
    }

    const boldOnly = trimmed.match(/^\*\*([^*]+)\*\*:?$/)

    if (boldOnly) {
      block(pdfCleanInline(boldOnly[1]), {
        size: 12,
        bold: true,
        before: 10,
        after: 3,
        keepNext: true,
      })
      continue
    }

    const bullet = line.match(/^(\s*)[-*+\u2022]\s+(.*)$/)

    if (bullet) {
      const level = Math.min(
        Math.floor(bullet[1].replace(/\t/g, '  ').length / 2),
        3
      )

      block(pdfCleanInline(bullet[2]), {
        size: 10.5,
        indent: 10 + level * 14,
        marker: '\u2022',
        after: 3,
      })
      continue
    }

    const numbered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/)

    if (numbered) {
      block(pdfCleanInline(numbered[3]), {
        size: 10.5,
        indent: 10,
        marker: `${numbered[2]}.`,
        after: 3,
      })
      continue
    }

    block(pdfCleanInline(trimmed), {
      size: 10.5,
      after: 6,
    })
  }

  // ---------- page numbers ----------

  pages.forEach((pageOps, index) => {
    const label = pdfEncode(`Page ${index + 1} of ${pages.length}`)
    const width = pdfTextWidth(label, 8, false)

    pageOps.push(
      `0.5 g BT /F1 8 Tf 1 0 0 1 ${((PAGE_W - width) / 2).toFixed(2)} 34 Tm (${pdfEscape(label)}) Tj ET`
    )
  })

  // ---------- assemble the PDF file ----------

  const objects: string[] = []
  const pageNumbers: number[] = []

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'

  pages.forEach((pageOps, index) => {
    const pageNumber = 5 + index * 2
    const contentNumber = pageNumber + 1
    const stream = pageOps.join('\n')

    pageNumbers.push(pageNumber)

    objects[pageNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`

    objects[contentNumber] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  objects[2] =
    `<< /Type /Pages /Kids [${pageNumbers
      .map(number => `${number} 0 R`)
      .join(' ')}] /Count ${pageNumbers.length} >>`

  const infoNumber = objects.length

  objects[infoNumber] =
    `<< /Title (${pdfEscape(
      title.replace(/[^\x20-\x7e]/g, '')
    )}) /Producer (Business Research) >>`

  let file = '%PDF-1.4\n%' + String.fromCharCode(0xe2, 0xe3, 0xcf, 0xd3) + '\n'
  const offsets: number[] = []

  for (let n = 1; n < objects.length; n++) {
    offsets[n] = file.length
    file += `${n} 0 obj\n${objects[n]}\nendobj\n`
  }

  const xrefStart = file.length

  file += `xref\n0 ${objects.length}\n0000000000 65535 f \n`

  for (let n = 1; n < objects.length; n++) {
    file += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }

  file +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoNumber} 0 R >>\n` +
    `startxref\n${xrefStart}\n%%EOF`

  const bytes = new Uint8Array(file.length)

  for (let i = 0; i < file.length; i++) {
    bytes[i] = file.charCodeAt(i) & 0xff
  }

  return new Blob([bytes], { type: 'application/pdf' })
}


function ReportViewer({
  report,
  onBack,
}: {
  report: Report
  onBack: () => void
}) {

  const reportViewerRef = useRef<HTMLDivElement | null>(null)

  const content = normalizeReportContent(getReportContent(report))

  const parsedSections =
    parseReportSections(content)

  const sectionMap = new Map<string, string>()

  parsedSections.forEach(section => {
    const key = getSectionKey(section.title)

    if (key) {
      const previous = sectionMap.get(key)

      sectionMap.set(
        key,
        previous
          ? `${previous}\n\n${section.content}`
          : section.content
      )
    }
  })

  // If the backend output doesn't contain recognizable headings,
  // keep the complete response visible instead of hiding it.
  if (sectionMap.size === 0 && content.trim()) {
    sectionMap.set(
      'executive-summary',
      content.trim()
    )
  }

  return (
    <>
      <style jsx global>{`
        .sidebar-back-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          margin: 0 0 12px;
          border: 1px solid rgba(127, 127, 127, 0.20);
          border-radius: 10px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          text-align: left;
        }

        .sidebar-back-btn:hover {
          background: rgba(127, 127, 127, 0.10);
        }

        .recent-row-menu {
          position: relative;
          flex: 0 0 auto;
        }

        .recent-row-menu-panel {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          z-index: 50;
          min-width: 145px;
          padding: 5px;
          border: 1px solid rgba(127, 127, 127, 0.22);
          border-radius: 10px;
          background: #111722;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
        }

        .recent-row-menu-panel button {
          display: block;
          width: 100%;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: inherit;
          padding: 8px 10px;
          text-align: left;
          cursor: pointer;
          font-size: 12px;
        }

        .recent-row-menu-panel button:hover {
          background: rgba(127, 127, 127, 0.10);
        }

        .recent-row-menu-panel .danger-action {
          color: #ff7777;
        }

        .research-row {
          cursor: pointer;
        }

        /* -------------------------------------------------------
           REPORT VIEWER SCROLLING
           ------------------------------------------------------- */

        /* The report itself owns the vertical scroll. This keeps the
           report navigation visible while the full report is read. */
        .report-viewer {
          height: calc(100vh - 72px);
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
          overscroll-behavior: contain;
          scroll-padding-top: 24px;
        }

        .report-layout {
          display: grid;
          grid-template-columns: 230px minmax(0, 1fr);
          gap: 42px;
          align-items: start;
          width: 100%;
          min-height: calc(100vh - 80px);
        }

        .report-nav {
          position: sticky;
          top: 24px;
          align-self: start;
          max-height: calc(100vh - 48px);
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 8px;
          scrollbar-width: thin;
        }

        .report-nav a {
          display: block;
          cursor: pointer;
        }

        .report-nav a.disabled {
          cursor: default;
          opacity: 0.55;
        }

        .report-content {
          min-width: 0;
          width: 100%;
        }

        .markdown-content {
          min-width: 0;
        }

        .report-content section {
          scroll-margin-top: 24px;
        }

        @media (max-width: 900px) {
          .report-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .report-nav {
            position: sticky;
            top: 0;
            z-index: 10;
            max-height: none;
            overflow-x: auto;
            overflow-y: hidden;
            display: flex;
            gap: 18px;
            padding: 12px 0;
            white-space: nowrap;
          }

          .report-nav .section-kicker {
            flex: 0 0 auto;
          }

          .report-nav a {
            flex: 0 0 auto;
          }
        }

        .report-markdown-block p {
          margin: 0 0 14px;
          line-height: 1.75;
        }

        .report-markdown-block ul {
          margin: 0 0 16px;
          padding-left: 22px;
        }

        .report-markdown-block li {
          margin: 7px 0;
          line-height: 1.7;
        }

        .report-markdown-block strong {
          font-weight: 700;
        }

        .report-markdown-block code {
          padding: 2px 6px;
          border-radius: 5px;
          background: rgba(127, 127, 127, 0.14);
        }

        .report-markdown-block a {
          text-decoration: underline;
        }

        .report-markdown-table-wrap {
          width: 100%;
          overflow-x: auto;
          margin: 14px 0 20px;
        }

        .report-markdown-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
        }

        .report-markdown-table th,
        .report-markdown-table td {
          padding: 10px 12px;
          border: 1px solid rgba(127, 127, 127, 0.22);
          text-align: left;
          vertical-align: top;
          line-height: 1.55;
        }

        .report-markdown-table th {
          font-weight: 700;
          background: rgba(127, 127, 127, 0.10);
        }

        @media print {
          @page {
            size: A4;
            margin: 18mm 16mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #111111 !important;
          }

          body * {
            visibility: hidden !important;
          }

          .report-viewer,
          .report-viewer * {
            visibility: visible !important;
          }

          .report-viewer {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #111111 !important;
          }

          .report-toolbar,
          .report-nav,
          .sidebar,
          .topbar,
          .mobile-scrim {
            display: none !important;
          }

          .report-layout {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .report-content {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #111111 !important;
          }

          .report-content h2 {
            font-size: 24pt !important;
            line-height: 1.25 !important;
            margin: 0 0 8pt !important;
            color: #111111 !important;
          }

          .report-content h3 {
            font-size: 16pt !important;
            line-height: 1.3 !important;
            margin: 22pt 0 8pt !important;
            color: #111111 !important;
            page-break-after: avoid !important;
          }

          .report-meta {
            color: #444444 !important;
            margin-bottom: 18pt !important;
          }

          .markdown-content,
          .report-section-body,
          .report-section-body p {
            color: #222222 !important;
          }

          .report-section-body p {
            font-size: 10.5pt !important;
            line-height: 1.65 !important;
            margin: 0 0 10pt !important;
          }

          .report-content section {
            page-break-inside: avoid;
          }

          .report-content section + section {
            page-break-before: auto;
          }

          .status {
            border: 1px solid #cccccc !important;
            background: #f5f5f5 !important;
            color: #222222 !important;
          }

          .accent-eyebrow {
            color: #444444 !important;
          }
        }
      `}</style>

      <div ref={reportViewerRef} className="report-viewer view-enter">

      <div className="report-toolbar">

        <button
          className="back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to reports
        </button>

        <div className="toolbar-actions">


          <button
            className="icon-btn"
            title="Download report as PDF"
            onClick={() => {
              const reportTitle =
                report.user_query ||
                report.query ||
                'Research report'

              const fileBase =
                reportTitle
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '')
                  .slice(0, 60) ||
                `report-${report.id || 'download'}`

              let blob: Blob
              let fileName: string

              try {
                blob = buildReportPdf(
                  reportTitle,
                  `Research report  ·  ${formatReportDate(report.created_at)}  ·  Report ID ${report.id || 'Unavailable'}`,
                  content
                )
                fileName = `${fileBase}.pdf`
              } catch {
                // Safety net: if the PDF cannot be built, still save the text.
                blob = new Blob(
                  [content],
                  { type: 'text/plain' }
                )
                fileName = `${fileBase}.txt`
              }

              const url =
                URL.createObjectURL(blob)

              const a =
                document.createElement('a')

              a.href = url
              a.download = fileName
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)

              window.setTimeout(
                () => URL.revokeObjectURL(url),
                1000
              )
            }}
          >
            <ArrowDownToLine size={16} />
          </button>

          <button
            className="icon-btn print-report-btn"
            title="Print / Save as PDF"
            onClick={() => window.print()}
          >
            <Printer size={16} />
          </button>


        </div>
      </div>

      <div className="report-layout">

        <aside className="report-nav">

          <span className="section-kicker">
            In this report
          </span>

          {REPORT_SECTIONS.map(
            (section, index) => {

              const hasContent =
                sectionMap.has(section.key)

              return (
                <a
                  key={section.key}
                  href={`#${section.key}`}
                  className={
                    hasContent
                      ? index === 0
                        ? 'active'
                        : ''
                      : 'disabled'
                  }
                  onClick={event => {
                    event.preventDefault()

                    if (!hasContent) {
                      return
                    }

                    const viewer = reportViewerRef.current
                    const target = viewer?.querySelector<HTMLElement>(
                      `#${section.key}`
                    )

                    if (!target) {
                      return
                    }

                    // Scroll the actual section into view. This is more
                    // reliable than calculating scrollTop manually and
                    // works with the report container and normal page flow.
                    target.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                      inline: 'nearest',
                    })
                  }}
                >
                  {String(index + 1).padStart(2, '0')}{' '}
                  {section.label}
                </a>
              )
            }
          )}

        </aside>

        <article className="report-content">

          <span className="eyebrow accent-eyebrow">
            <FileText size={13} />
            Research report ·{' '}
            {formatReportDate(report.created_at)}
          </span>

          <h2>
            {report.user_query ||
              report.query ||
              'Research report'}
          </h2>

          <div className="report-meta">
            <StatusBadge
              status={
                report.status ||
                'Completed'
              }
            />

            <span
              className="report-id-quiet"
              title={`Report ID ${report.id || 'Unavailable'}`}
            >
              {sectionMap.size} sections · ID {report.id || 'n/a'}
            </span>
          </div>

          <div className="markdown-content">

            {REPORT_SECTIONS.map(section => {

              const sectionContent =
                sectionMap.get(section.key)

              if (!sectionContent) {
                return null
              }

              return (
                <section
                  key={section.key}
                  id={section.key}
                  style={{
                    scrollMarginTop: '24px',
                  }}
                >

                  <h3>
                    {section.label}
                  </h3>

                  <div className="report-section-body">

                    {sectionContent
                      .split(/\n\s*\n/)
                      .map((paragraph, index) => {
                        const cleaned = paragraph.trim()

                        if (!cleaned) {
                          return null
                        }

                        return (
                          <MarkdownBlock
                            key={index}
                            text={cleaned}
                          />
                        )
                      })}

                  </div>

                </section>
              )
            })}

          </div>

        </article>

      </div>
    </div>
    </>
  )
}


// HISTORY
// ---------------------------------------------------------

function History({
  reports,
  search,
  setSearch,
  onOpen,
  onDelete,
  loading,
}: {
  reports: Report[]
  search: string
  setSearch: (s: string) => void
  onOpen: (r: Report) => void
  onDelete: (id: string) => void
  loading: boolean
}) {

  return (
    <div className="view-enter">

      <div className="page-intro">

        <div>

          <span className="eyebrow accent-eyebrow">
            <Clock3 size={13} />
            Knowledge base
          </span>

          <h2>
            Research history
          </h2>

          <p>
            Every question you have sent
            to the research network.
          </p>

        </div>


      </div>


      <div className="table-card">

        <div className="table-toolbar">

          <div className="search-input">

            <Search size={16} />

            <input
              value={search}
              onChange={e =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search research history"
            />

          </div>

          <span>
            {reports.length} reports
          </span>

        </div>


        {loading ? (

          <div className="loading-state">

            <Loader2
              className="spin"
              size={20}
            />

            Loading research history...

          </div>

        ) : reports.length ? (

          <div className="history-table">

            <div className="history-header">

              <span>
                Report
              </span>

              <span>
                Status
              </span>

              <span>
                Date
              </span>

              <span />

            </div>


            {reports.map(
              (report, i) => (

                <div
                  className="history-row"
                  key={
                    report.id || i
                  }
                >

                  <div className="history-title">

                    <span className="row-icon">
                      <FileText size={16} />
                    </span>

                    <span>

                      <strong>
                        {report.user_query ||
                          report.query ||
                          'Untitled research'}
                      </strong>

                      <small>
                        {report.id ||
                          'Report ID unavailable'}
                      </small>

                    </span>

                  </div>


                  <StatusBadge
                    status={
                      report.status ||
                      'Completed'
                    }
                  />


                  <span className="date-cell">

                    {report.created_at ? formatReportDate(report.created_at) : '—'}

                  </span>


                  <div className="history-actions">

                    <button
                      type="button"
                      onClick={() =>
                        onOpen(report)
                      }
                    >
                      Open
                      <ArrowUpRight size={14} />
                    </button>

                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() =>
                        onDelete(String(report.id))
                      }
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        ) : (

          <EmptyState
            title="No matching research"
            description="Try a different search or start a new research brief."
          />

        )}

      </div>

    </div>
  )
}


// ---------------------------------------------------------
// ARCHITECTURE
// ---------------------------------------------------------

function Architecture() {

  // The three parallel agents stay hidden until the arrow is clicked.
  const [parallelOpen, setParallelOpen] =
    useState(false)

  const stacks = [
    {
      title: 'React frontend',
      icon: LayoutDashboard,
      sub: 'Presentation & interaction',
    },
    {
      title: 'FastAPI backend',
      icon: Server,
      sub: 'API orchestration layer',
    },
    {
      title: 'LangGraph',
      icon: GitBranch,
      sub: 'Agent workflow runtime',
    },
  ]


  const nodes = [
    'Planner agent',
    'Parallel research agents',
    'Analysis agent',
    'Writer agent',
    'Reviewer agent',
    'Final report',
  ]


  return (
    <div className="view-enter">

      <style jsx global>{`
        .ar-stack-row,
        .ar-chain {
          --ar-line: rgba(124, 108, 255, 0.7);
        }

        /* ---------- top row: React -> FastAPI -> LangGraph ---------- */

        .ar-stack-row {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ar-stack-step {
          display: flex;
          align-items: center;
        }

        .ar-stack-item {
          width: 168px;
        }

        .ar-stack-item .stack-node {
          width: 100%;
          box-sizing: border-box;
        }

        .ar-hlink {
          position: relative;
          flex: 0 0 auto;
          width: 34px;
          height: 2px;
          background: var(--ar-line);
        }

        .ar-hlink::after {
          content: '';
          position: absolute;
          right: -1px;
          top: 50%;
          transform: translateY(-50%);
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-left: 7px solid var(--ar-line);
        }

        @media (max-width: 1000px) {
          .ar-stack-row,
          .ar-stack-step {
            flex-direction: column;
          }

          .ar-hlink {
            width: 2px;
            height: 24px;
          }

          .ar-hlink::after {
            right: auto;
            top: auto;
            left: 50%;
            bottom: -1px;
            transform: translateX(-50%);
            border-top: 7px solid var(--ar-line);
            border-bottom: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
          }
        }

        /* ---------- orchestration chain ---------- */

        .ar-chain {
          display: flex;
          flex-direction: column;
          width: 360px;
          max-width: 100%;
          margin: 0 auto;
        }

        .ar-chain-step {
          display: flex;
          flex-direction: column;
        }

        .ar-link {
          position: relative;
          width: 2px;
          height: 26px;
          margin: 0 auto;
          background: var(--ar-line);
        }

        .ar-link::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -1px;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid var(--ar-line);
        }

        /* ---------- hover: tiles grow with a springy easing ---------- */

        .ar-stack-row .stack-node.ar-grow,
        .ar-chain .arch-node.ar-grow {
          position: relative;
          transition:
            transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.3s ease,
            border-color 0.3s ease;
          will-change: transform;
        }

        .ar-stack-row .stack-node.ar-grow:hover,
        .ar-chain .arch-node.ar-grow:hover {
          transform: scale(1.05);
          z-index: 3;
          border-color: rgba(124, 108, 255, 0.75);
          box-shadow: 0 12px 32px rgba(124, 108, 255, 0.22);
        }

        /* ---------- arrow button that reveals the 3 hidden agents ---------- */

        .ar-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          padding: 0;
          border-radius: 8px;
          border: 1px solid rgba(124, 108, 255, 0.45);
          background: rgba(124, 108, 255, 0.14);
          color: #a79dff;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .ar-toggle:hover {
          background: rgba(124, 108, 255, 0.28);
        }

        .ar-toggle svg {
          transition: transform 0.35s ease;
        }

        .ar-toggle[aria-expanded='true'] svg {
          transform: rotate(180deg);
        }

        /* ---------- collapsible branch ---------- */

        .ar-branch {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ar-branch.open {
          grid-template-rows: 1fr;
        }

        .ar-branch-inner {
          min-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .ar-branch.open .ar-branch-inner {
          opacity: 1;
        }

        .ar-fan {
          position: relative;
          height: 40px;
        }

        .ar-fan svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .ar-fan path {
          fill: none;
          stroke: var(--ar-line);
          stroke-width: 2px;
          vector-effect: non-scaling-stroke;
        }

        .ar-fan i {
          position: absolute;
          bottom: 0;
          width: 0;
          height: 0;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid var(--ar-line);
        }

        .ar-chips {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .ar-chip-cell {
          min-width: 0;
          padding: 0 6px;
        }

        .ar-chip {
          text-align: center;
          padding: 8px 4px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #a79dff;
          background: rgba(124, 108, 255, 0.16);
          border: 1px solid rgba(124, 108, 255, 0.3);
          transform: translateY(-6px);
          transition:
            transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.3s ease;
        }

        .ar-branch.open .ar-chip {
          transform: none;
        }

        .ar-branch.open .ar-chip:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 20px rgba(124, 108, 255, 0.25);
        }

        @media (prefers-reduced-motion: reduce) {
          .ar-stack-row .stack-node.ar-grow,
          .ar-chain .arch-node.ar-grow,
          .ar-toggle svg,
          .ar-branch,
          .ar-branch-inner,
          .ar-chip {
            transition: none !important;
          }
        }
      `}</style>

      <div className="page-intro">

        <div>

          <span className="eyebrow accent-eyebrow">
            <Code2 size={13} />
            Technical blueprint
          </span>

          <h2>
            System architecture
          </h2>

          <p>
            A visual map of the intelligence
            stack powering your research
            workspace.
          </p>

        </div>


        <span className="architecture-chip">

          <span className="mini-dot green" />

          Production pattern

        </span>

      </div>


      <div className="architecture-canvas">

        {/* React -> FastAPI -> LangGraph, joined by lines with arrowheads */}
        <div className="ar-stack-row">

          {stacks.map(
            (stack, i) => {

              const StackIcon =
                stack.icon

              return (
                <div
                  key={stack.title}
                  className="ar-stack-step"
                >

                  <div className="ar-stack-item">

                    <div className="stack-node ar-grow">

                      <span className="stack-icon">
                        <StackIcon size={20} />
                      </span>

                      <strong>
                        {stack.title}
                      </strong>

                      <small>
                        {stack.sub}
                      </small>

                    </div>

                  </div>

                  {i <
                    stacks.length - 1 && (
                    <div
                      className="ar-hlink"
                      aria-hidden="true"
                    />
                  )}

                </div>
              )
            }
          )}

        </div>


        <div className="arch-line" />


        <div className="architecture-flow">

          <div className="flow-label">
            Agent orchestration
          </div>


          <div className="ar-chain">

            {nodes.map(
              (node, i) => {

                const isParallel = i === 1

                return (
                  <div
                    key={node}
                    className="ar-chain-step"
                  >

                    <div
                      className={`arch-node ar-grow ${
                        isParallel
                          ? 'parallel-node'
                          : ''
                      }`}
                      style={
                        isParallel
                          ? { paddingRight: 52 }
                          : undefined
                      }
                    >

                      <span>
                        {String(i + 1).padStart(
                          2,
                          '0'
                        )}
                      </span>

                      <strong>
                        {node}
                      </strong>

                      {isParallel && (
                        <button
                          type="button"
                          className="ar-toggle"
                          aria-expanded={parallelOpen}
                          aria-controls="ar-parallel-branch"
                          aria-label={
                            parallelOpen
                              ? 'Hide parallel agents'
                              : 'Show parallel agents'
                          }
                          title={
                            parallelOpen
                              ? 'Hide parallel agents'
                              : 'Show parallel agents'
                          }
                          onClick={() =>
                            setParallelOpen(open => !open)
                          }
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}

                    </div>


                    {isParallel && (
                      <div
                        id="ar-parallel-branch"
                        className={`ar-branch ${
                          parallelOpen ? 'open' : ''
                        }`}
                        aria-hidden={!parallelOpen}
                      >

                        <div className="ar-branch-inner">

                          {/* branches out of the Parallel tile */}
                          <div
                            className="ar-fan"
                            aria-hidden="true"
                          >
                            <svg
                              viewBox="0 0 100 40"
                              preserveAspectRatio="none"
                              focusable="false"
                            >
                              <path d="M50 0 V20 M16.6667 20 H83.3333 M16.6667 20 V40 M50 20 V40 M83.3333 20 V40" />
                            </svg>
                            <i style={{ left: '16.6667%' }} />
                            <i style={{ left: '50%' }} />
                            <i style={{ left: '83.3333%' }} />
                          </div>

                          <div className="ar-chips">
                            {['Market', 'Company', 'Competitor'].map(
                              name => (
                                <div
                                  key={name}
                                  className="ar-chip-cell"
                                >
                                  <div className="ar-chip">
                                    {name}
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          {/* the three branches merge back together */}
                          <div
                            className="ar-fan"
                            aria-hidden="true"
                          >
                            <svg
                              viewBox="0 0 100 40"
                              preserveAspectRatio="none"
                              focusable="false"
                            >
                              <path d="M16.6667 0 V20 M50 0 V20 M83.3333 0 V20 M16.6667 20 H83.3333 M50 20 V40" />
                            </svg>
                          </div>

                        </div>

                      </div>
                    )}


                    {i <
                      nodes.length - 1 && (
                      <div
                        className="ar-link"
                        aria-hidden="true"
                      />
                    )}

                  </div>
                )
              }
            )}

          </div>

        </div>


        <div className="external-services">

          <div className="flow-label">
            External services
          </div>


          <div className="service-grid">

            <div>

              <Globe2 size={19} />

              <span>

                <strong>
                  Tavily
                </strong>

                <small>
                  Web search
                </small>

              </span>

            </div>


            <div>

              <Sparkles size={19} />

              <span>

                <strong>
                  Gemini
                </strong>

                <small>
                  LLM reasoning
                </small>

              </span>

            </div>


            <div>

              <Database size={19} />

              <span>

                <strong>
                  PostgreSQL
                </strong>

                <small>
                  Persistent reports
                </small>

              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
