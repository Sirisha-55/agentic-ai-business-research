'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Copy,
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
  Search,
  Server,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'
type View = 'dashboard' | 'new' | 'workspace' | 'reports' | 'history' | 'architecture' | 'settings'
type Report = { id: string; user_query?: string; query?: string; created_at?: string; status?: string; content?: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new', label: 'New research', icon: Plus },
  { id: 'workspace', label: 'Research workspace', icon: Network },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'history', label: 'Research history', icon: Archive },
  { id: 'architecture', label: 'Architecture', icon: Code2 },
]

const agents = [
  { name: 'Planner', description: 'Breaks the research question into focused workstreams.', icon: Target, accent: 'blue' },
  { name: 'Market Agent', description: 'Maps market size, trends, signals and dynamics.', icon: TrendingUp, accent: 'violet' },
  { name: 'Company Agent', description: 'Builds a clear view of company performance.', icon: Building2, accent: 'cyan' },
  { name: 'Competitor Agent', description: 'Surfaces competitive threats and white space.', icon: Compass, accent: 'amber' },
  { name: 'Analysis Agent', description: 'Synthesizes evidence into actionable insights.', icon: BarChart3, accent: 'pink' },
  { name: 'Writer Agent', description: 'Turns research into a decision-ready report.', icon: FileText, accent: 'green' },
  { name: 'Reviewer Agent', description: 'Checks clarity, sources and strategic rigor.', icon: CheckCircle2, accent: 'indigo' },
]

function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span>{!collapsed && <span>research<span className="brand-dot">.ai</span></span>}</div>
}

function StatusBadge({ status = 'Connected' }: { status?: string }) {
  const tone = status.toLowerCase()
  return <span className={`status status-${tone}`}><span className="status-dot" />{status}</span>
}

function ThemeSwitcher({ theme, setTheme }: { theme: Theme; setTheme: (value: Theme) => void }) {
  return <div className="theme-switcher" aria-label="Theme mode">
    {([['light', Sun], ['dark', Moon], ['system', CircleDot]] as const).map(([value, Icon]) => <button key={value} onClick={() => setTheme(value)} className={theme === value ? 'active' : ''} title={`${value} mode`} aria-label={`${value} mode`}><Icon size={15} /></button>)}
  </div>
}

function Sidebar({ view, setView, collapsed, setCollapsed, mobileOpen, setMobileOpen }: { view: View; setView: (v: View) => void; collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
    <div className="sidebar-top"><Logo collapsed={collapsed} /><button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
    <div className="workspace-pill"><span className="workspace-avatar">AR</span>{!collapsed && <><span><strong>Atlas Research</strong><small>Personal workspace</small></span><ChevronDown size={14} /></>}</div>
    <nav className="main-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => { setView(id); setMobileOpen(false) }}><Icon size={18} /><span>{label}</span>{id === 'new' && !collapsed && <span className="nav-plus">⌘N</span>}</button>)}</nav>
    <div className="sidebar-bottom"><button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings size={18} /><span>Settings</span></button><div className="user-card"><span className="avatar">JD</span>{!collapsed && <span><strong>Jordan Davis</strong><small>Free workspace</small></span>}</div><button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /><span>Collapse</span></>}</button></div>
  </aside>
}

function Topbar({ title, theme, setTheme, onMenu, connected }: { title: string; theme: Theme; setTheme: (value: Theme) => void; onMenu: () => void; connected: boolean }) {
  return <header className="topbar"><div className="topbar-title"><button className="icon-btn mobile-menu" onClick={onMenu}><Menu size={20} /></button><div><span className="eyebrow">Workspace / {title}</span><h1>{title}</h1></div></div><div className="topbar-actions"><div className="backend-status"><span className={connected ? 'pulse online' : 'pulse'} /><span>{connected ? 'Backend connected' : 'Backend offline'}</span></div><button className="search-trigger"><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button><ThemeSwitcher theme={theme} setTheme={setTheme} /><button className="icon-btn notification" aria-label="Notifications"><Activity size={17} /><i /></button><button className="top-avatar">JD</button></div></header>
}

function StatCard({ label, value, meta, icon: Icon, tone }: { label: string; value: string | number; meta: string; icon: typeof FileText; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{meta}</small></div><ArrowUpRight className="stat-arrow" size={17} /></div>
}

function AgentCard({ agent, index, compact = false }: { agent: typeof agents[number]; index: number; compact?: boolean }) {
  const Icon = agent.icon
  return <div className={`agent-card ${compact ? 'compact' : ''} accent-${agent.accent}`} style={{ animationDelay: `${index * 70}ms` }}><div className="agent-card-top"><span className="agent-icon"><Icon size={18} /></span><StatusBadge status="Ready" /></div><div><h3>{agent.name}</h3><p>{agent.description}</p></div>{!compact && <div className="agent-footer"><span><span className="mini-dot" /> Architecture node</span><MoreHorizontal size={16} /></div>}</div>
}

function Pipeline() {
  return <section className="section pipeline-section"><div className="section-heading"><div><span className="section-kicker"><span className="kicker-line" /> System overview</span><h2>AI research pipeline</h2><p>A multi-agent workflow designed to turn complex questions into clear decisions.</p></div><button className="outline-btn">View architecture <ArrowUpRight size={15} /></button></div><div className="pipeline"><div className="pipeline-row single"><AgentCard agent={agents[0]} index={0} compact /></div><div className="connector vertical" /><div className="pipeline-row three">{agents.slice(1, 4).map((agent, i) => <AgentCard key={agent.name} agent={agent} index={i + 1} compact />)}</div><div className="merge-line"><span /><span /><span /></div><div className="connector vertical" /><div className="pipeline-row single"><AgentCard agent={agents[4]} index={4} compact /></div><div className="connector vertical" /><div className="pipeline-row two">{agents.slice(5).map((agent, i) => <AgentCard key={agent.name} agent={agent} index={i + 5} compact />)}</div></div></section>
}

function EmptyState({ title = 'No research yet', description = 'Start your first research project to see reports here.' }: { title?: string; description?: string }) { return <div className="empty-state"><div className="empty-icon"><FileText size={22} /></div><h3>{title}</h3><p>{description}</p></div> }

export default function Page() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [view, setView] = useState<View>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [backendOnline, setBackendOnline] = useState(false)
  const [query, setQuery] = useState('')
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [historySearch, setHistorySearch] = useState('')

  useEffect(() => { const stored = window.localStorage.getItem('research-theme') as Theme | null; if (stored) setThemeState(stored) }, [])
  useEffect(() => { const root = document.documentElement; root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)); root.classList.toggle('light', theme === 'light'); window.localStorage.setItem('research-theme', theme) }, [theme])
  useEffect(() => { const fetchData = async () => { try { const [health, list] = await Promise.all([axios.get(`${API_BASE}/health`), axios.get(`${API_BASE}/reports`)]); setBackendOnline(health.status >= 200 && health.status < 300); setReports(Array.isArray(list.data) ? list.data : list.data?.reports || []) } catch { setBackendOnline(false) } finally { setLoadingReports(false) } }; fetchData() }, [])

  const setTheme = (value: Theme) => setThemeState(value)
  const title = navItems.find(item => item.id === view)?.label || (view === 'settings' ? 'Settings' : 'Dashboard')
  const filteredReports = useMemo(() => reports.filter(report => (report.user_query || report.query || '').toLowerCase().includes(historySearch.toLowerCase())), [reports, historySearch])

  const startResearch = async () => { if (!query.trim() || researching) return; setError(''); setResearching(true); try { const response = await axios.post(`${API_BASE}/research`, { user_query: query.trim() }); const report = response.data?.report || response.data; if (report?.id || report?.report_id) { setReports(current => [report, ...current]); setSelectedReport(report); setView('reports') } else { setView('workspace') } } catch (err: any) { const status = err?.response?.status; setError(status === 429 ? 'The research queue is busy. Please try again in a moment.' : status === 500 ? 'The research service encountered an error. Please try again.' : 'Unable to reach the research backend. Check that FastAPI is running.') } finally { setResearching(false) } }
  const deleteReport = async (id: string) => { try { await axios.delete(`${API_BASE}/reports/${id}`); setReports(current => current.filter(report => (report.id || (report as any).report_id) !== id)); if (selectedReport?.id === id) setSelectedReport(null) } catch { setError('Unable to delete this report. Please try again.') } }

  const renderView = () => {
    if (view === 'new') return <NewResearch query={query} setQuery={setQuery} onStart={startResearch} researching={researching} error={error} />
    if (view === 'workspace') return <Workspace />
    if (view === 'reports') return <Reports reports={reports} selectedReport={selectedReport} setSelectedReport={setSelectedReport} onDelete={deleteReport} />
    if (view === 'history') return <History reports={filteredReports} search={historySearch} setSearch={setHistorySearch} onOpen={async (report) => { try { const response = await axios.get(`${API_BASE}/reports/${report.id}`); setSelectedReport(response.data); setView('reports') } catch { setError('Unable to open report.') } }} onDelete={deleteReport} loading={loadingReports} />
    if (view === 'architecture') return <Architecture />
    if (view === 'settings') return <SettingsView theme={theme} setTheme={setTheme} apiBase={API_BASE} />
    return <Dashboard reports={reports} backendOnline={backendOnline} setView={setView} />
  }

  return <div className="app-shell"><Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><div className="main-shell"><Topbar title={title} theme={theme} setTheme={setTheme} onMenu={() => setMobileOpen(true)} connected={backendOnline} /><main className="content">{renderView()}</main></div>{mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}</div>
}

function Dashboard({ reports, backendOnline, setView }: { reports: Report[]; backendOnline: boolean; setView: (v: View) => void }) {
  return <div className="view-enter"><section className="hero"><div className="hero-glow" /><div className="hero-copy"><span className="eyebrow accent-eyebrow"><Sparkles size={13} /> Intelligence workspace</span><h2>AI-powered<br /><em>business research.</em></h2><p>Research markets, companies and competitors using a multi-agent AI workflow.</p><div className="hero-actions"><button className="primary-btn" onClick={() => setView('new')}><Plus size={17} /> Start new research <span className="button-shortcut">⌘ ↵</span></button><button className="ghost-btn" onClick={() => setView('reports')}>View reports <ArrowUpRight size={16} /></button></div></div><div className="hero-visual"><div className="orb orb-one" /><div className="orb orb-two" /><div className="orb-core"><Sparkles size={22} /><span>Agents ready</span></div><div className="visual-ring ring-one" /><div className="visual-ring ring-two" /><div className="visual-label label-one"><span className="mini-dot green" /> Live synthesis</div><div className="visual-label label-two"><span className="mini-dot blue" /> 7 agents</div></div></section><section className="stats-grid"><StatCard label="Total reports" value={reports.length} meta="From connected backend" icon={FileBarChart} tone="blue" /><StatCard label="Completed research" value={reports.filter(r => r.status === 'completed' || !r.status).length} meta="Ready to read" icon={CheckCircle2} tone="green" /><StatCard label="Active research" value={reports.filter(r => r.status === 'running').length} meta="Currently processing" icon={Zap} tone="violet" /><StatCard label="Backend status" value={backendOnline ? 'Online' : 'Offline'} meta={backendOnline ? 'FastAPI is reachable' : 'Check your API connection'} icon={Server} tone={backendOnline ? 'cyan' : 'red'} /></section><section className="split-sections"><section className="section recent-section"><div className="section-heading compact-heading"><div><span className="section-kicker"><span className="kicker-line" /> Your workspace</span><h2>Recent research</h2></div><button className="text-btn" onClick={() => setView('history')}>View history <ChevronRight size={15} /></button></div>{reports.length ? <div className="recent-list">{reports.slice(0, 4).map((report, i) => <ResearchRow key={report.id || i} report={report} />)}</div> : <EmptyState />}</section><section className="insight-card"><div className="insight-orb"><Sparkles size={19} /></div><span className="section-kicker">Power your next decision</span><h3>Start with a question.</h3><p>Give your research team a complex question and let the agent network find the signal.</p><button className="outline-btn" onClick={() => setView('new')}>Explore a query <ArrowUpRight size={15} /></button></section></section><Pipeline /></div>
}

function ResearchRow({ report }: { report: Report }) { return <div className="research-row"><div className="row-icon"><FileText size={17} /></div><div className="row-main"><strong>{report.user_query || report.query || 'Untitled research'}</strong><span>{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Date unavailable'} · {report.id ? `ID ${String(report.id).slice(0, 8)}` : 'Report'}</span></div><StatusBadge status={report.status || 'Completed'} /><button className="row-more"><MoreHorizontal size={17} /></button></div> }

function NewResearch({ query, setQuery, onStart, researching, error }: { query: string; setQuery: (v: string) => void; onStart: () => void; researching: boolean; error: string }) { const examples = ['Analyze the Indian electric vehicle market', 'Compare Stripe and Adyen growth strategies', 'Find opportunities in sustainable packaging']; return <div className="new-research view-enter"><div className="new-intro"><span className="eyebrow accent-eyebrow"><Sparkles size={13} /> Research studio</span><h2>What would you like<br /><em>to understand?</em></h2><p>Ask a complex business question. Our agent network will map the market, evaluate companies and synthesize a decision-ready report.</p></div><div className="query-card"><div className="query-card-top"><span><MessageSquareText size={17} /> Research brief</span><span className="char-count">{query.length} / 2,000</span></div><textarea value={query} maxLength={2000} onChange={e => setQuery(e.target.value)} placeholder="Analyze the Indian electric vehicle market and identify the major competitors of Tata Motors." aria-label="Research question" /><div className="query-footer"><span className="query-hint"><Zap size={14} /> Multi-agent analysis · usually takes a few minutes</span><button className="primary-btn" onClick={onStart} disabled={!query.trim() || researching}>{researching ? <><Loader2 size={16} className="spin" /> Starting research...</> : <><Play size={16} /> Start research</>}</button></div></div>{error && <div className="error-banner"><AlertCircle size={17} /> {error}</div>}<div className="examples"><span>Try an example</span>{examples.map(example => <button key={example} onClick={() => setQuery(example)}>{example}<ArrowUpRight size={14} /></button>)}</div></div> }

function Workspace() { return <div className="view-enter"><div className="page-intro"><div><span className="eyebrow accent-eyebrow"><Network size={13} /> Visual workflow</span><h2>Research workspace</h2><p>Explore the LangGraph architecture behind every research report.</p></div><StatusBadge status="Representation only" /></div><div className="workspace-banner"><div className="workspace-banner-icon"><Activity size={21} /></div><div><strong>Workflow visualization</strong><p>Agent statuses shown here describe the architecture, not live backend events.</p></div></div><div className="workspace-grid"><div className="workspace-column"><div className="workspace-node root-node"><span className="node-number">01</span><div><strong>User query</strong><small>Research brief received</small></div><CircleDot size={18} /></div><div className="flow-line" />{agents.slice(0, 4).map((agent, i) => <div key={agent.name}><div className="workspace-node"><span className={`agent-icon small accent-${agent.accent}`}><agent.icon size={15} /></span><div><strong>{agent.name}</strong><small>{agent.description}</small></div><StatusBadge status={i === 0 ? 'Ready' : 'Pending'} /></div>{i < 3 && <div className="flow-line" />}</div>)}<div className="flow-line" /><div className="workspace-node final-node"><span className="agent-icon small accent-green"><CheckCircle2 size={15} /></span><div><strong>Final report</strong><small>Decision-ready output</small></div><StatusBadge status="Ready" /></div></div><div className="workspace-aside"><div className="aside-card"><span className="section-kicker">Agent network</span><div className="network-stat"><strong>7</strong><span>specialized agents<br />in the workflow</span></div><div className="progress-bars"><i /><i /><i /><i /><i /></div><p>Parallel research agents converge into one grounded, reviewed report.</p></div><div className="aside-card"><span className="section-kicker">Workflow legend</span><div className="legend"><span><i className="legend-dot blue" /> Ready to run</span><span><i className="legend-dot gray" /> Pending input</span><span><i className="legend-dot green" /> Output stage</span></div></div></div></div></div> }

function Reports({ reports, selectedReport, setSelectedReport, onDelete }: { reports: Report[]; selectedReport: Report | null; setSelectedReport: (r: Report | null) => void; onDelete: (id: string) => void }) { if (!selectedReport) return <div className="view-enter"><div className="page-intro"><div><span className="eyebrow accent-eyebrow"><FileBarChart size={13} /> Knowledge base</span><h2>Your reports</h2><p>Read, revisit and share the intelligence your agents have discovered.</p></div><button className="primary-btn" onClick={() => setSelectedReport(null)}><Plus size={16} /> New report</button></div>{reports.length ? <div className="report-grid">{reports.map((report, i) => <button className="report-tile" key={report.id || i} onClick={() => setSelectedReport(report)}><div className="report-tile-top"><span className="row-icon"><FileText size={17} /></span><MoreHorizontal size={17} /></div><h3>{report.user_query || report.query || 'Untitled research'}</h3><p>{report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Date unavailable'}</p><span className="report-tile-link">Open report <ArrowUpRight size={14} /></span></button>)}</div> : <EmptyState title="No reports available" description="Complete a research brief to create your first report." />}</div>; return <ReportViewer report={selectedReport} onBack={() => setSelectedReport(null)} onDelete={onDelete} /> }

function ReportViewer({ report, onBack, onDelete }: { report: Report; onBack: () => void; onDelete: (id: string) => void }) { const content = report.content || 'This report does not include rendered content yet. Open the original report in your connected backend to review the full analysis.'; return <div className="report-viewer view-enter"><div className="report-toolbar"><button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back to reports</button><div className="toolbar-actions"><button className="icon-btn" title="Copy report" onClick={() => navigator.clipboard?.writeText(content)}><Copy size={16} /></button><button className="icon-btn" title="Download report" onClick={() => { const blob = new Blob([content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${report.id || 'report'}.txt`; a.click(); URL.revokeObjectURL(url) }}><ArrowDownToLine size={16} /></button><button className="icon-btn danger" title="Delete report" onClick={() => onDelete(report.id)}><Trash2 size={16} /></button></div></div><div className="report-layout"><aside className="report-nav"><span className="section-kicker">In this report</span>{['Executive summary', 'Market overview', 'Company analysis', 'Competitor analysis', 'Opportunities', 'Challenges', 'Key insights', 'Conclusion'].map((item, i) => <a key={item} className={i === 0 ? 'active' : ''} href={`#${item.replaceAll(' ', '-')}`}>{String(i + 1).padStart(2, '0')} {item}</a>)}</aside><article className="report-content"><span className="eyebrow accent-eyebrow"><FileText size={13} /> Research report · {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'Undated'}</span><h2>{report.user_query || report.query || 'Research report'}</h2><div className="report-meta"><StatusBadge status={report.status || 'Completed'} /><span>Report ID {report.id || 'Unavailable'}</span></div><div className="markdown-content"><h3 id="executive-summary">Executive summary</h3><p>{content}</p><h3 id="key-insights">Key insights</h3><p>Insights are presented directly from the connected research backend. Use the navigation to move through the report sections when structured content is available.</p></div></article></div></div> }

function History({ reports, search, setSearch, onOpen, onDelete, loading }: { reports: Report[]; search: string; setSearch: (s: string) => void; onOpen: (r: Report) => void; onDelete: (id: string) => void; loading: boolean }) { return <div className="view-enter"><div className="page-intro"><div><span className="eyebrow accent-eyebrow"><Clock3 size={13} /> Knowledge base</span><h2>Research history</h2><p>Every question you have sent to the research network.</p></div><button className="primary-btn"><Plus size={16} /> New research</button></div><div className="table-card"><div className="table-toolbar"><div className="search-input"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search research history" /></div><span>{reports.length} reports</span></div>{loading ? <div className="loading-state"><Loader2 className="spin" size={20} /> Loading research history...</div> : reports.length ? <div className="history-table"><div className="history-header"><span>Report</span><span>Status</span><span>Date</span><span /></div>{reports.map((report, i) => <div className="history-row" key={report.id || i}><div className="history-title"><span className="row-icon"><FileText size={16} /></span><span><strong>{report.user_query || report.query || 'Untitled research'}</strong><small>{report.id || 'Report ID unavailable'}</small></span></div><StatusBadge status={report.status || 'Completed'} /><span className="date-cell">{report.created_at ? new Date(report.created_at).toLocaleDateString() : '—'}</span><div className="history-actions"><button onClick={() => onOpen(report)}>Open <ArrowUpRight size={14} /></button><button className="icon-btn danger" onClick={() => onDelete(report.id)}><Trash2 size={15} /></button></div></div>)}</div> : <EmptyState title="No matching research" description="Try a different search or start a new research brief." />}</div></div> }

function Architecture() { const stacks = [{ title: 'React frontend', icon: LayoutDashboard, sub: 'Presentation & interaction' }, { title: 'FastAPI backend', icon: Server, sub: 'API orchestration layer' }, { title: 'LangGraph', icon: GitBranch, sub: 'Agent workflow runtime' }]; const nodes = ['Planner agent', 'Parallel research agents', 'Analysis agent', 'Writer agent', 'Reviewer agent', 'Final report']; return <div className="view-enter"><div className="page-intro"><div><span className="eyebrow accent-eyebrow"><Code2 size={13} /> Technical blueprint</span><h2>System architecture</h2><p>A visual map of the intelligence stack powering your research workspace.</p></div><span className="architecture-chip"><span className="mini-dot green" /> Production pattern</span></div><div className="architecture-canvas"><div className="stack-row">{stacks.map((stack, i) => <div key={stack.title} className="stack-node"><span className="stack-icon"><stack.icon size={20} /></span><strong>{stack.title}</strong><small>{stack.sub}</small>{i < stacks.length - 1 && <ChevronDown className="stack-arrow" size={17} />}</div>)}</div><div className="arch-line" /> <div className="architecture-flow"><div className="flow-label">Agent orchestration</div>{nodes.map((node, i) => <div key={node} className={`arch-node ${i === 1 ? 'parallel-node' : ''}`}><span>{String(i + 1).padStart(2, '0')}</span><strong>{node}</strong>{i === 1 && <div className="parallel-agents"><i>Market</i><i>Company</i><i>Competitor</i></div>}{i < nodes.length - 1 && <ChevronDown className="flow-arrow" size={17} />}</div>)}</div><div className="external-services"><div className="flow-label">External services</div><div className="service-grid"><div><Globe2 size={19} /><span><strong>Tavily</strong><small>Web search</small></span></div><div><Sparkles size={19} /><span><strong>Gemini</strong><small>LLM reasoning</small></span></div><div><Database size={19} /><span><strong>PostgreSQL</strong><small>Persistent reports</small></span></div></div></div></div></div> }

function SettingsView({ theme, setTheme, apiBase }: { theme: Theme; setTheme: (v: Theme) => void; apiBase: string }) { return <div className="view-enter"><div className="page-intro"><div><span className="eyebrow accent-eyebrow"><Settings size={13} /> Workspace preferences</span><h2>Settings</h2><p>Configure how your research workspace looks and connects.</p></div></div><div className="settings-grid"><div className="settings-card"><div className="settings-card-heading"><span className="row-icon"><Sun size={17} /></span><div><h3>Appearance</h3><p>Choose how research.ai looks for you.</p></div></div><div className="theme-options">{(['light', 'dark', 'system'] as Theme[]).map(value => <button className={theme === value ? 'selected' : ''} key={value} onClick={() => setTheme(value)}>{value === 'light' ? <Sun size={17} /> : value === 'dark' ? <Moon size={17} /> : <CircleDot size={17} />}<span>{value[0].toUpperCase() + value.slice(1)}</span>{theme === value && <Check size={15} />}</button>)}</div></div><div className="settings-card"><div className="settings-card-heading"><span className="row-icon"><Server size={17} /></span><div><h3>Backend connection</h3><p>The API endpoint used by your workspace.</p></div></div><label className="settings-label">API base URL</label><div className="api-field"><Server size={15} /><span>{apiBase}</span><StatusBadge status="Configured" /></div><p className="settings-note">Connection status is checked when the workspace loads. No credentials are stored in this interface.</p></div></div></div> }
