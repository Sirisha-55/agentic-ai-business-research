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
    name: 'Planner',
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
}: {
  view: View
  setView: (v: View) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}) {
  return (
    <aside
      className={`sidebar ${
        collapsed ? 'collapsed' : ''
      } ${mobileOpen ? 'mobile-open' : ''}`}
    >

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
        className="sidebar-back-btn"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 10px',
          marginBottom: 12,
          border: '1px solid rgba(127, 127, 127, 0.20)',
          borderRadius: 10,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'left',
        }}
        onClick={() => {
          setView('dashboard')
          setMobileOpen(false)
        }}
        title="Back to dashboard"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
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
              onClick={() => {
                setView(id)
                setMobileOpen(false)
              }}
            >

              <Icon size={18} />

              <span>{label}</span>

              {id === 'new' &&
                !collapsed && (
                  <span className="nav-plus">
                    ⌘N
                  </span>
                )}

            </button>
          )
        )}

      </nav>


      <div className="sidebar-bottom">

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
}: {
  title: string
  theme: Theme
  setTheme: (value: Theme) => void
  onMenu: () => void
}) {
  return (
    <header className="topbar">

      <div className="topbar-title">

        <button
          className="icon-btn mobile-menu"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div>
          <span className="eyebrow">
            Workspace / {title}
          </span>

          <h1>{title}</h1>
        </div>

      </div>

      <div className="topbar-actions">

        {/* Clean topbar: only theme modes are shown here. */}
        <ThemeSwitcher
          theme={theme}
          setTheme={setTheme}
        />

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

      <ArrowUpRight
        className="stat-arrow"
        size={17}
      />

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


      <div className="pipeline">

        <div className="pipeline-row single">
          <AgentCard
            agent={agents[0]}
            index={0}
            compact
          />
        </div>

        <div className="connector vertical" />

        <div className="pipeline-row three">

          {agents
            .slice(1, 4)
            .map((agent, i) => (
              <AgentCard
                key={agent.name}
                agent={agent}
                index={i + 1}
                compact
              />
            ))}

        </div>


        <div className="merge-line">
          <span />
          <span />
          <span />
        </div>

        <div className="connector vertical" />


        <div className="pipeline-row single">

          <AgentCard
            agent={agents[4]}
            index={4}
            compact
          />

        </div>


        <div className="connector vertical" />


        <div className="pipeline-row two">

          {agents
            .slice(5)
            .map((agent, i) => (
              <AgentCard
                key={agent.name}
                agent={agent}
                index={i + 5}
                compact
              />
            ))}

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
    useState<Theme>('dark')

  const [view, setView] =
    useState<View>('dashboard')

  const [collapsed, setCollapsed] =
    useState(false)

  const [mobileOpen, setMobileOpen] =
    useState(false)

  const [reports, setReports] =
    useState<Report[]>([])

  const [loadingReports, setLoadingReports] =
    useState(true)

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

      } catch {

        // Keep the dashboard usable while the backend is unavailable.
        // Real backend connectivity will be handled when API integration is enabled.

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
      } catch {
        setError(
          'Unable to delete this report. Please try again.'
        )
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
    <div className="app-shell">

      <Sidebar
        view={view}
        setView={setView}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="main-shell">

        <Topbar
          title={title}
          theme={theme}
          setTheme={setTheme}
          onMenu={() =>
            setMobileOpen(true)
          }
        />

        <main className="content">
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
            <em>business research.</em>
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
              <span className="button-shortcut">
                ⌘ ↵
              </span>
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
                    onDelete={onDeleteReport}
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
  onDelete,
}: {
  report: Report
  onOpen: (report: Report) => void
  onDelete: (id: string) => void
}) {

  const [menuOpen, setMenuOpen] = useState(false)
  const reportId = String(report.id || '')

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

      <div
        className="recent-row-menu"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          className="row-more"
          title="More actions"
          aria-label="More actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(current => !current)}
        >
          <MoreHorizontal size={17} />
        </button>

        {menuOpen && (
          <div
            className="recent-row-menu-panel"
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
              onClick={() => {
                setMenuOpen(false)
                onOpen(report)
              }}
            >
              Open report
            </button>
            <button
              type="button"
              className="danger-action"
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
              onClick={() => {
                setMenuOpen(false)
                onDelete(reportId)
              }}
            >
              Delete report
            </button>
          </div>
        )}
      </div>

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

      <div className="research-note">
        <CheckCircle2 size={15} />
        <span>
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

  const getAgentStatus = (
    agentName: string
  ): AgentExecutionStatus => {
    return (
      agentProgress[
        agentName
      ]?.status ||
      'waiting'
    )
  }

  const getStatusLabel = (
    status: AgentExecutionStatus
  ) => {
    if (status === 'running') {
      return 'Running'
    }

    if (status === 'completed') {
      return 'Done'
    }

    if (status === 'error') {
      return 'Error'
    }

    return 'Waiting'
  }

  const completedCount =
    Object.values(
      agentProgress
    ).filter(
      item =>
        item.status ===
        'completed'
    ).length

  const activeCount =
    Object.values(
      agentProgress
    ).filter(
      item =>
        item.status ===
        'running'
    ).length

  return (
    <div className="view-enter">

      <div className="page-intro">

        <div>

          <span className="eyebrow accent-eyebrow">
            <Network size={13} />
            Live visual workflow
          </span>

          <h2>
            Research workspace
          </h2>

          <p>
            Watch the real LangGraph agent execution
            as your research request moves through
            the workflow.
          </p>

        </div>

        <StatusBadge
          status={
            researching
              ? 'Running'
              : completedCount === 8
              ? 'Completed'
              : 'Ready'
          }
        />

      </div>

      <div className="workspace-banner">

        <div className="workspace-banner-icon">
          <Activity size={21} />
        </div>

        <div>

          <strong>
            Live workflow visualization
          </strong>

          <p>
            {researching
              ? activeAgentMessage
              : completedCount === 8
              ? 'All eight agents completed successfully.'
              : 'Start a research request to see live agent events here.'}
          </p>

        </div>

      </div>

      {query && (
        <div className="workspace-query-card">

          <span className="section-kicker">
            <span className="kicker-line" />
            Current research query
          </span>

          <strong>
            {query}
          </strong>

        </div>
      )}

      <div className="workspace-grid">

        <div className="workspace-column">

          {/* User query node */}

          <div className="workspace-node root-node">

            <span className="node-number">
              01
            </span>

            <div>

              <strong>
                User query
              </strong>

              <small>
                {query
                  ? 'Research brief received'
                  : 'Waiting for research brief'}
              </small>

            </div>

            <CircleDot size={18} />

          </div>

          <div className="flow-line" />

          {/* Planner Agent */}

          {agents
            .slice(0, 1)
            .map(agent => {

              const AgentIcon =
                agent.icon

              const status =
                getAgentStatus(
                  'Planner Agent'
                )

              return (
                <div key={agent.name}>

                  <div className="workspace-node">

                    <span
                      className={`agent-icon small accent-${agent.accent}`}
                    >
                      <AgentIcon size={15} />
                    </span>

                    <div>

                      <strong>
                        {agent.name}
                      </strong>

                      <small>
                        {agentProgress[
                          'Planner Agent'
                        ]?.message ||
                          agent.description}
                      </small>

                    </div>

                    <StatusBadge
                      status={getStatusLabel(
                        status
                      )}
                    />

                  </div>

                  <div className="flow-line" />

                </div>
              )
            })}

          {/* Parallel research agents */}

          <div className="workspace-parallel">

            {agents
              .slice(1, 4)
              .map(agent => {

                const AgentIcon =
                  agent.icon

                const status =
                  getAgentStatus(
                    agent.name
                  )

                return (
                  <div
                    key={agent.name}
                    className="workspace-parallel-node"
                  >

                    <div className="workspace-node">

                      <span
                        className={`agent-icon small accent-${agent.accent}`}
                      >
                        <AgentIcon size={15} />
                      </span>

                      <div>

                        <strong>
                          {agent.name}
                        </strong>

                        <small>
                          {agentProgress[
                            agent.name
                          ]?.message ||
                            agent.description}
                        </small>

                      </div>

                      <StatusBadge
                        status={getStatusLabel(
                          status
                        )}
                      />

                    </div>

                  </div>
                )
              })}

          </div>

          <div className="merge-line">
            <span />
            <span />
            <span />
          </div>

          <div className="flow-line" />

          {/* Analysis Agent */}

          {agents
            .slice(4, 5)
            .map(agent => {

              const AgentIcon =
                agent.icon

              const status =
                getAgentStatus(
                  agent.name
                )

              return (
                <div key={agent.name}>

                  <div className="workspace-node">

                    <span
                      className={`agent-icon small accent-${agent.accent}`}
                    >
                      <AgentIcon size={15} />
                    </span>

                    <div>

                      <strong>
                        {agent.name}
                      </strong>

                      <small>
                        {agentProgress[
                          agent.name
                        ]?.message ||
                          agent.description}
                      </small>

                    </div>

                    <StatusBadge
                      status={getStatusLabel(
                        status
                      )}
                    />

                  </div>

                  <div className="flow-line" />

                </div>
              )
            })}

          {/* Writer → Reviewer → Final Report */}

          {agents
            .slice(5)
            .map((agent, i) => {

              const AgentIcon =
                agent.icon

              const status =
                getAgentStatus(
                  agent.name
                )

              return (
                <div
                  key={agent.name}
                >

                  <div
                    className={`workspace-node ${
                      agent.name ===
                      'Final Report Agent'
                        ? 'final-node'
                        : ''
                    }`}
                  >

                    <span
                      className={`agent-icon small accent-${agent.accent}`}
                    >
                      <AgentIcon size={15} />
                    </span>

                    <div>

                      <strong>
                        {agent.name}
                      </strong>

                      <small>
                        {agentProgress[
                          agent.name
                        ]?.message ||
                          agent.description}
                      </small>

                    </div>

                    <StatusBadge
                      status={getStatusLabel(
                        status
                      )}
                    />

                  </div>

                  {i <
                    agents.slice(5).length - 1 && (
                    <div className="flow-line" />
                  )}

                </div>
              )
            })}

        </div>

        <div className="workspace-aside">

          <div className="aside-card">

            <span className="section-kicker">
              Agent execution
            </span>

            <div className="network-stat">

              <strong>
                {completedCount}
                <span
                  style={{
                    fontSize: '0.55em',
                  }}
                >
                  /8
                </span>
              </strong>

              <span>
                agents completed
                <br />
                in this run
              </span>

            </div>

            <div className="progress-bars">

              {agents.map(agent => {

                const status =
                  getAgentStatus(
                    agent.name
                  )

                return (
                  <i
                    key={agent.name}
                    className={
                      status ===
                      'completed'
                        ? 'completed'
                        : status ===
                          'running'
                        ? 'active'
                        : ''
                    }
                  />
                )
              })}

            </div>

            <p>
              {activeCount > 0
                ? `${activeCount} agent${
                    activeCount >
                    1
                      ? 's'
                      : ''
                  } currently running.`
                : completedCount ===
                  8
                ? 'The complete agent workflow has finished.'
                : 'Parallel research agents will converge into one reviewed report.'}
            </p>

          </div>

          <div className="aside-card">

            <span className="section-kicker">
              Workflow legend
            </span>

            <div className="legend">

              <span>
                <i className="legend-dot blue" />
                Running
              </span>

              <span>
                <i className="legend-dot gray" />
                Waiting
              </span>

              <span>
                <i className="legend-dot green" />
                Completed
              </span>

            </div>

          </div>

          <div className="aside-card">

            <span className="section-kicker">
              Execution message
            </span>

            <p>
              {activeAgentMessage}
            </p>

          </div>

        </div>

      </div>

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
}: {
  reports: Report[]
  selectedReport: Report | null
  setSelectedReport: (
    r: Report | null
  ) => void
}) {

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

          <button
            className="primary-btn"
            onClick={() =>
              setSelectedReport(null)
            }
          >
            <Plus size={16} />
            New report
          </button>

        </div>


        {reports.length ? (

          <div className="report-grid">

            {reports.map(
              (report, i) => (

                <button
                  className="report-tile"
                  key={
                    report.id || i
                  }
                  onClick={() =>
                    setSelectedReport(
                      report
                    )
                  }
                >

                  <div className="report-tile-top">

                    <span className="row-icon">
                      <FileText size={17} />
                    </span>

                    <MoreHorizontal size={17} />

                  </div>

                  <h3>
                    {report.user_query ||
                      report.query ||
                      'Untitled research'}
                  </h3>

                  <p>
                    {formatReportDate(report.created_at)}
                  </p>

                  <span className="report-tile-link">

                    Open report

                    <ArrowUpRight size={14} />

                  </span>

                </button>

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

function normalizeReportContent(content: string) {
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
            title="Download report"
            onClick={() => {
              const blob = new Blob(
                [content],
                { type: 'text/plain' }
              )

              const url =
                URL.createObjectURL(blob)

              const a =
                document.createElement('a')

              a.href = url
              a.download =
                `${report.id || 'report'}.txt`
              a.click()

              URL.revokeObjectURL(url)
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

            <span>
              Report ID {report.id || 'Unavailable'}
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

        <div className="stack-row">

          {stacks.map(
            (stack, i) => {

              const StackIcon =
                stack.icon

              return (
                <div
                  key={stack.title}
                  className="stack-node"
                >

                  <span className="stack-icon">
                    <StackIcon size={20} />
                  </span>

                  <strong>
                    {stack.title}
                  </strong>

                  <small>
                    {stack.sub}
                  </small>

                  {i <
                    stacks.length - 1 && (
                    <ChevronDown
                      className="stack-arrow"
                      size={17}
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


          {nodes.map(
            (node, i) => (

              <div
                key={node}
                className={`arch-node ${
                  i === 1
                    ? 'parallel-node'
                    : ''
                }`}
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


                {i === 1 && (

                  <div className="parallel-agents">

                    <i>
                      Market
                    </i>

                    <i>
                      Company
                    </i>

                    <i>
                      Competitor
                    </i>

                  </div>

                )}


                {i <
                  nodes.length - 1 && (
                  <ChevronDown
                    className="flow-arrow"
                    size={17}
                  />
                )}

              </div>

            )
          )}

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
