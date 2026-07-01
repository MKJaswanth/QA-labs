import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useProjects } from '../hooks/useProjects'
import { useTestCases } from '../hooks/useTestCases'
import { useTestRuns } from '../hooks/useTestRuns'
import { useBugs } from '../hooks/useBugs'
import { useRequirements } from '../hooks/useRequirements'
import { useMilestones } from '../hooks/useMilestones'
import { useTestPlans } from '../hooks/useTestPlans'
import { normalizeTestStatus } from '../utils/status'
import { isOpenBug } from '../utils/reportMetrics'
import { getMilestoneMetrics } from '../utils/planMetrics'
import { getRunDraft } from '../utils/runDrafts'

const SEV_TONE = { Critical: 'failed', Major: 'pending', Minor: 'neutral' }

function StatCard({ label, value, sub, tone }) {
  return (
    <div className={`proj-stat-card proj-stat-card--${tone || 'neutral'}`}>
      <strong className="proj-stat-value">{value}</strong>
      <span className="proj-stat-label">{label}</span>
      {sub && <span className="proj-stat-sub">{sub}</span>}
    </div>
  )
}

function NavIcon({ children }) {
  return (
    <svg
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

function QuickNavCard({ to, icon, label, count, desc }) {
  return (
    <Link to={to} className="proj-qnav-card">
      <div className="proj-qnav-icon-box">
        <NavIcon>{icon}</NavIcon>
      </div>
      <div className="proj-qnav-body">
        <div className="proj-qnav-top">
          <span className="proj-qnav-label">{label}</span>
          {count != null && <span className="proj-qnav-badge">{count}</span>}
        </div>
        {desc && <span className="proj-qnav-desc">{desc}</span>}
      </div>
    </Link>
  )
}

export function ProjectDashboardPage() {
  const { projectId } = useParams()
  const { projects } = useProjects()
  const { testCases } = useTestCases(projectId)
  const { runs } = useTestRuns(projectId)
  const { bugs } = useBugs(projectId)
  const { requirements } = useRequirements(projectId)
  const { milestones } = useMilestones(projectId)
  const { plans } = useTestPlans(projectId)

  const project = projects.find(p => p.id === projectId)
  const base = `/projects/${projectId}`

  const stats = useMemo(() => {
    const total = testCases.length
    const passed = testCases.filter(tc => normalizeTestStatus(tc.status) === 'Pass').length
    const failed = testCases.filter(tc => normalizeTestStatus(tc.status) === 'Fail').length
    const blockers = testCases.filter(tc => normalizeTestStatus(tc.status) === 'Blocker').length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    const openBugs = bugs.filter(isOpenBug).length
    const criticalBugs = bugs.filter(b => isOpenBug(b) && b.severity === 'Critical').length
    const coveredReqs = requirements.filter(r => (r.testCaseIds || []).length > 0).length
    const reqCovPct = requirements.length > 0 ? Math.round((coveredReqs / requirements.length) * 100) : 0
    return { total, passed, failed, blockers, passRate, openBugs, criticalBugs, coveredReqs, reqCovPct }
  }, [testCases, bugs, requirements])

  // Runs are only persisted (via addRun) once completed — an in-progress run
  // lives solely in the draft storage until finished, so check there instead
  // of filtering the completed `runs` list (which never has one without completedAt).
  const activeDraft = useMemo(() => getRunDraft(projectId), [projectId])

  const recentRuns = useMemo(() =>
    runs.filter(r => r.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5),
  [runs])

  const openBugsList = useMemo(() =>
    bugs.filter(isOpenBug)
      .sort((a, b) => {
        const o = { Critical: 0, Major: 1, Minor: 2 }
        return (o[a.severity] ?? 3) - (o[b.severity] ?? 3)
      })
      .slice(0, 6),
  [bugs])

  const activeMilestones = useMemo(() =>
    milestones
      .filter(m => m.status !== 'Completed')
      .map(m => ({ milestone: m, metrics: getMilestoneMetrics(m, plans, runs, requirements, testCases, bugs) }))
      .sort((a, b) => (a.milestone.dueDate || '9999').localeCompare(b.milestone.dueDate || '9999')),
  [milestones, plans, runs, requirements, testCases, bugs])

  if (!project) return null

  const healthTone = stats.passRate >= 70 ? 'good' : stats.passRate >= 50 ? 'warn' : 'bad'
  const healthLabel = stats.passRate >= 70 ? 'Healthy' : stats.passRate >= 50 ? 'At risk' : 'Critical'

  return (
    <div className="page-entrance">
      <PageHeader
        title={project.name}
        description={project.description}
        action={
          <div className="page-actions-row">
            <Link to={`${base}/test-runs`} className="secondary-button" style={{ textDecoration: 'none' }}>
              Start run
            </Link>
            <Link to={`${base}/bugs`} className="primary-button" style={{ textDecoration: 'none' }}>
              + Log bug
            </Link>
          </div>
        }
      />

      {/* Quick navigation */}
      <div className="proj-qnav-grid">
        <QuickNavCard
          to={`${base}/test-cases`}
          label="Test cases"
          count={testCases.length}
          desc="Write and organize test cases"
          icon={<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="m3 6 .8.8L5.5 5" /><path d="m3 12 .8.8 1.7-1.8" /><path d="m3 18 .8.8 1.7-1.8" /></>}
        />
        <QuickNavCard
          to={`${base}/requirements`}
          label="Requirements"
          count={requirements.length}
          desc="Track coverage by requirement"
          icon={<><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /><path d="m9 11 3 3L22 4" /></>}
        />
        <QuickNavCard
          to={`${base}/test-runs`}
          label="Test runs"
          count={runs.length}
          desc="Execute and monitor testing"
          icon={<><path d="M5 4v16" /><path d="m5 12 6-4v8Z" /><path d="M15 8h4" /><path d="M15 16h4" /></>}
        />
        <QuickNavCard
          to={`${base}/test-plans`}
          label="Plans & milestones"
          count={plans.length + milestones.length}
          desc="Track release milestones"
          icon={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6" /><path d="M9 16h6" /></>}
        />
        <QuickNavCard
          to={`${base}/bugs`}
          label="Bug tracker"
          count={stats.openBugs}
          desc={stats.openBugs > 0 ? `${stats.openBugs} open bug${stats.openBugs !== 1 ? 's' : ''}` : 'Log and triage defects'}
          icon={<><path d="M8 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0Z" /><path d="M3 13h5" /><path d="M16 13h5" /><path d="M4 20l4-3" /><path d="m16 17 4 3" /><path d="M9 4 7 2" /><path d="m15 4 2-2" /></>}
        />
        <QuickNavCard
          to={`${base}/reports`}
          label="Reports"
          desc="View metrics and trends"
          icon={<><path d="M4 19V5" /><path d="M20 19H4" /><path d="M8 15v-4" /><path d="M13 15V8" /><path d="M18 15v-6" /></>}
        />
      </div>

      {/* Stats strip */}
      <div className="proj-stats-strip">
        <StatCard
          label="Test cases"
          value={stats.total}
          sub={stats.total > 0 ? `${stats.passed} passed` : 'None yet'}
          tone="neutral"
        />
        <div className="proj-stats-divider" />
        <StatCard
          label="Pass rate"
          value={`${stats.passRate}%`}
          sub={healthLabel}
          tone={healthTone}
        />
        <div className="proj-stats-divider" />
        <StatCard
          label="Open bugs"
          value={stats.openBugs}
          sub={stats.criticalBugs > 0 ? `${stats.criticalBugs} critical` : 'None critical'}
          tone={stats.openBugs > 0 ? (stats.criticalBugs > 0 ? 'bad' : 'warn') : 'good'}
        />
        <div className="proj-stats-divider" />
        <StatCard
          label="Req coverage"
          value={`${stats.reqCovPct}%`}
          sub={`${stats.coveredReqs} / ${requirements.length} reqs`}
          tone={stats.reqCovPct >= 80 ? 'good' : stats.reqCovPct >= 50 ? 'warn' : 'neutral'}
        />
        <div className="proj-stats-divider" />
        <StatCard
          label="Blockers"
          value={stats.blockers}
          sub={stats.blockers > 0 ? 'Need attention' : 'All clear'}
          tone={stats.blockers > 0 ? 'bad' : 'good'}
        />
        <div className="proj-stats-divider" />
        <StatCard
          label="Runs"
          value={runs.length}
          sub={activeDraft ? '1 in progress' : 'None active'}
          tone={activeDraft ? 'warn' : 'neutral'}
        />
      </div>

      {/* In-progress run — show prominently if a draft exists */}
      {activeDraft && (
        <div className="proj-active-runs">
          <div className="proj-active-runs-label">
            <span className="proj-active-dot" />
            1 run in progress
          </div>
          <div className="proj-active-runs-list">
            <Link to={`${base}/test-runs`} className="proj-active-run-chip">
              <span className="proj-active-run-name">{activeDraft.runName || 'Unnamed run'}</span>
              {activeDraft.build && <span className="proj-active-run-build">{activeDraft.build}</span>}
              {activeDraft.startedAt && (
                <span className="proj-active-run-date">{new Date(activeDraft.startedAt).toLocaleDateString()}</span>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="proj-dash-grid">

        {/* Left column: runs + milestones */}
        <div className="proj-dash-col">

          {/* Recent completed runs */}
          <section className="panel proj-dash-panel">
            <div className="section-header">
              <h2>Recent runs</h2>
              <Link to={`${base}/test-runs`} className="text-link" style={{ fontSize: 12 }}>View all →</Link>
            </div>
            {recentRuns.length === 0 ? (
              <div className="proj-dash-empty">
                <p>No completed runs yet.</p>
                <Link to={`${base}/test-runs`} className="secondary-button" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>
                  Start first run
                </Link>
              </div>
            ) : (
              <div className="proj-run-list">
                {recentRuns.map(run => {
                  const rate = run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0
                  const tone = rate >= 80 ? 'passed' : rate >= 50 ? 'pending' : 'failed'
                  return (
                    <div key={run.id} className="proj-run-row">
                      <div className="proj-run-row-main">
                        <Link to={`${base}/test-runs/${run.id}`} className="proj-run-name text-link">
                          {run.name || 'Untitled run'}
                        </Link>
                        {run.build && <span className="proj-run-build">{run.build}</span>}
                      </div>
                      <div className="proj-run-row-meta">
                        <StatusPill tone={tone}>{rate}% pass</StatusPill>
                        <span className="proj-run-date">{new Date(run.completedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Active milestones */}
          {activeMilestones.length > 0 && (
            <section className="panel proj-dash-panel">
              <div className="section-header">
                <h2>Milestones</h2>
                <Link to={`${base}/test-plans`} className="text-link" style={{ fontSize: 12 }}>View all →</Link>
              </div>
              <div className="proj-milestone-list">
                {activeMilestones.map(({ milestone, metrics }) => {
                  const tone = metrics.overdue ? 'failed' : metrics.onTrack ? 'passed' : 'pending'
                  const countEl = metrics.overdue
                    ? `${Math.abs(metrics.daysLeft)}d overdue`
                    : metrics.daysLeft != null
                      ? `${metrics.daysLeft}d left`
                      : 'No date'
                  return (
                    <div key={milestone.id} className="proj-milestone-row">
                      <div className="proj-milestone-row-main">
                        <span className="proj-milestone-name">{milestone.name}</span>
                        <div className="proj-milestone-bar-wrap">
                          <div className="proj-milestone-bar">
                            <span style={{ width: `${metrics.progressPct}%`, background: metrics.overdue ? 'var(--danger)' : 'var(--accent)' }} />
                          </div>
                          <span className="proj-milestone-pct">{metrics.progressPct}%</span>
                        </div>
                      </div>
                      <div className="proj-milestone-row-right">
                        <StatusPill tone={tone}>{metrics.overdue ? 'Overdue' : metrics.onTrack ? 'On track' : 'At risk'}</StatusPill>
                        <span className="proj-milestone-due">{countEl}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right column: bugs + coverage */}
        <div className="proj-dash-col">
          <section className="panel proj-dash-panel">
            <div className="section-header">
              <h2>Open bugs</h2>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {stats.openBugs > 0 && <StatusPill tone="failed">{stats.openBugs} open</StatusPill>}
                <Link to={`${base}/bugs`} className="text-link" style={{ fontSize: 12 }}>View all →</Link>
              </div>
            </div>
            {openBugsList.length === 0 ? (
              <div className="proj-dash-empty">
                <p>No open bugs. Testing is clear!</p>
              </div>
            ) : (
              <div className="proj-bug-list">
                {openBugsList.map(bug => (
                  <div key={bug.id} className="proj-bug-row">
                    <div className="proj-bug-row-main">
                      <StatusPill tone={SEV_TONE[bug.severity] || 'neutral'} style={{ fontSize: 9, minHeight: 16, padding: '0 5px', flexShrink: 0 }}>
                        {bug.severity || 'Minor'}
                      </StatusPill>
                      <Link to={`${base}/bugs`} className="proj-bug-title text-link">{bug.title}</Link>
                    </div>
                    {bug.reportedDate && (
                      <span className="proj-bug-date">{new Date(bug.reportedDate).toLocaleDateString()}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Test coverage quick view */}
          <section className="panel proj-dash-panel">
            <div className="section-header">
              <h2>Coverage snapshot</h2>
            </div>
            <div className="proj-coverage-rows">
              <div className="proj-coverage-row">
                <span className="proj-cov-label">Test cases</span>
                <div className="proj-cov-bar-wrap">
                  <div className="proj-cov-bar">
                    <span style={{ width: `${stats.passRate}%`, background: 'var(--success)' }} />
                    <span style={{ width: `${stats.total > 0 ? Math.round(stats.failed / stats.total * 100) : 0}%`, background: 'var(--danger)' }} />
                  </div>
                </div>
                <span className="proj-cov-pct">{stats.passRate}% pass</span>
              </div>
              <div className="proj-coverage-row">
                <span className="proj-cov-label">Requirements</span>
                <div className="proj-cov-bar-wrap">
                  <div className="proj-cov-bar">
                    <span style={{ width: `${stats.reqCovPct}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
                <span className="proj-cov-pct">{stats.reqCovPct}% covered</span>
              </div>
            </div>
            {(stats.passed > 0 || stats.failed > 0 || stats.blockers > 0 || requirements.length > 0) && (
              <div className="proj-coverage-chips">
                {stats.passed > 0 && <span className="proj-cov-chip proj-cov-chip--pass">{stats.passed} passed</span>}
                {stats.failed > 0 && <span className="proj-cov-chip proj-cov-chip--fail">{stats.failed} failed</span>}
                {stats.blockers > 0 && <span className="proj-cov-chip proj-cov-chip--block">{stats.blockers} blocked</span>}
                {requirements.length > 0 && <span className="proj-cov-chip">{stats.coveredReqs}/{requirements.length} reqs covered</span>}
              </div>
            )}
          </section>
        </div>
      </div>

    </div>
  )
}
