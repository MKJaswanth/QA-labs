import { useEffect, useState } from 'react'
import { PassRing, Bar, TrendLineChart } from '../components/Charts'
import { fetchProjectDataOnce, getProjectsOnce } from '../utils/remoteStorage'
import { getProjectReportMetrics } from '../utils/reportMetrics'
import { isFirebaseEnabled } from '../utils/firebase'

export function PublicReportPage({ projectId }) {
  const [state, setState] = useState('loading') // loading | done | error
  const [metrics, setMetrics] = useState(null)
  const [runs, setRuns] = useState([])
  const [projectName, setProjectName] = useState('')
  const [generatedAt] = useState(() => new Date().toLocaleString())

  useEffect(() => {
    if (!isFirebaseEnabled) { setState('error'); return }
    Promise.all([
      getProjectsOnce(),
      fetchProjectDataOnce(projectId),
    ]).then(([projects, data]) => {
      const project = projects.find((p) => p.id === projectId)
      if (!project) { setState('error'); return }
      setProjectName(project.name)
      const liveCases = (data.testCases || []).filter((t) => !t.deleted)
      const liveBugs  = (data.bugs || []).filter((b) => !b.deleted)
      const liveRuns  = (data.runs || []).filter((r) => !r.deleted)
      const m = getProjectReportMetrics({ project, testCases: liveCases, bugs: liveBugs, runs: liveRuns })
      setMetrics(m)
      setRuns(liveRuns)
      setState('done')
    }).catch(() => setState('error'))
  }, [projectId])

  if (state === 'loading') {
    return (
      <div className="pub-report-loading">
        <div className="app-loading-spinner" aria-label="Loading" />
        <p>Loading report…</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="pub-report-loading">
        <p style={{ color: 'var(--danger)' }}>Report not available or project not found.</p>
      </div>
    )
  }

  const { passRate, coverage, total, passed, failed, blocker, skipped, pending,
          reported, inProgress, hold, needClarification, openBugs, critical, major, minor, health } = metrics

  return (
    <div className="pub-report">
      <header className="pub-report-header">
        <div className="pub-report-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 11 2 2 4-4" />
          </svg>
          QA Lab
        </div>
        <div className="pub-report-title-block">
          <h1>{projectName}</h1>
          <span className={`health-badge health-badge--${health.tone}`}>{health.label}</span>
        </div>
        <p className="pub-report-meta">Generated {generatedAt} · Read-only snapshot</p>
      </header>

      {/* KPI strip */}
      <div className="pub-report-kpi-strip">
        {[
          { label: 'Total cases', value: total },
          { label: 'Pass rate',   value: `${passRate}%`, highlight: passRate >= 70 ? 'pass' : passRate >= 50 ? 'warn' : 'fail' },
          { label: 'Coverage',    value: `${coverage}%` },
          { label: 'Open bugs',   value: openBugs, highlight: openBugs > 0 ? 'fail' : null },
          { label: 'Critical',    value: critical, highlight: critical > 0 ? 'fail' : null },
          { label: 'Total runs',  value: runs.length },
        ].map((k) => (
          <div key={k.label} className={`pub-kpi ${k.highlight ? `pub-kpi--${k.highlight}` : ''}`}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="pub-report-grid">
        <div className="pub-report-panel">
          <h2>Test results</h2>
          <div className="chart-split">
            <PassRing rate={passRate} />
            <div className="chart-bars">
              <Bar label="Pass"          value={passed}     total={total} tone="passed" />
              <Bar label="Fail"          value={failed}     total={total} tone="failed" />
              <Bar label="Blocker"       value={blocker}    total={total} tone="blocker" />
              <Bar label="Reported"      value={reported}   total={total} tone="reported" />
              <Bar label="In Progress"   value={inProgress} total={total} tone="inprogress" />
              <Bar label="Skipped"       value={skipped}    total={total} tone="skipped" />
              <Bar label="Not Executed"  value={pending}    total={total} tone="pending" />
            </div>
          </div>
        </div>

        <div className="pub-report-panel">
          <h2>Bug severity</h2>
          <div className="chart-bars" style={{ marginTop: '12px' }}>
            <Bar label="Critical" value={critical} total={openBugs || 1} tone="failed" />
            <Bar label="Major"    value={major}    total={openBugs || 1} tone="pending" />
            <Bar label="Minor"    value={minor}    total={openBugs || 1} tone="passed" />
          </div>
          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {openBugs} open bug{openBugs !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Trend */}
      {runs.length >= 2 && (
        <div className="pub-report-panel" style={{ marginTop: '16px' }}>
          <h2>Pass rate trend</h2>
          <TrendLineChart runs={runs} />
        </div>
      )}

      <footer className="pub-report-footer">
        Powered by <strong>QA Lab</strong> · qaura.bugauralabs.studio
      </footer>
    </div>
  )
}
