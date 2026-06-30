import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useRequirements } from '../hooks/useRequirements'
import { useTestCases } from '../hooks/useTestCases'
import { useTestRuns } from '../hooks/useTestRuns'
import { normalizeTestStatus, STATUS_TONE } from '../utils/status'

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }
const enc = (v) => encodeURIComponent(v)

/**
 * Build a map of testCaseId → latest execution status from the most recent run.
 * Runs are processed oldest-first so the newest run's status wins.
 */
function buildLatestStatusMap(runs) {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.completedAt || a.startedAt || 0) - new Date(b.completedAt || b.startedAt || 0),
  )
  const map = {}
  sorted.forEach((run) => {
    ;(run.cases || []).forEach((rc) => {
      if (rc.testCaseId) map[rc.testCaseId] = rc.status
    })
  })
  return map
}

export function RequirementCoverageMatrixPage() {
  const { projectId } = useParams()
  const { requirements } = useRequirements(projectId)
  const { testCases } = useTestCases(projectId)
  const { runs } = useTestRuns(projectId)

  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [coverageFilter, setCoverageFilter] = useState('All')
  const [expandedReqId, setExpandedReqId] = useState(null)
  const toggleExpand = (id) => setExpandedReqId((prev) => (prev === id ? null : id))

  const tcById = useMemo(() => new Map(testCases.map((tc) => [tc.id, tc])), [testCases])
  const latestStatusMap = useMemo(() => buildLatestStatusMap(runs), [runs])

  // Build matrix rows: one row per requirement.
  const rows = useMemo(() => {
    return requirements.map((req) => {
      const linkedIds = req.testCaseIds || []
      const linkedTcs = linkedIds
        .map((id) => tcById.get(id))
        .filter(Boolean)

      // Compute latest status for each linked TC
      const tcStatuses = linkedTcs.map((tc) => {
        const latestRunStatus = latestStatusMap[tc.id]
        const status = latestRunStatus || tc.status || 'Not Executed'
        return { tc, status: normalizeTestStatus(status) }
      })

      const total = tcStatuses.length
      const passed = tcStatuses.filter((t) => t.status === 'Pass').length
      const failed = tcStatuses.filter((t) => t.status === 'Fail').length
      const blocked = tcStatuses.filter((t) => t.status === 'Blocker').length
      const pending = tcStatuses.filter((t) => t.status === 'Not Executed').length
      const executed = total - pending

      let verdict, verdictTone
      if (total === 0) {
        verdict = 'Uncovered'
        verdictTone = 'failed'
      } else if (blocked > 0) {
        verdict = 'Blocked'
        verdictTone = 'blocker'
      } else if (failed > 0) {
        verdict = 'Failing'
        verdictTone = 'failed'
      } else if (passed === total && total > 0) {
        verdict = 'Verified'
        verdictTone = 'passed'
      } else if (executed === 0) {
        verdict = 'Pending'
        verdictTone = 'pending'
      } else {
        verdict = 'In progress'
        verdictTone = 'pending'
      }

      const pct = total > 0 ? Math.round((passed / total) * 100) : 0

      return {
        req,
        tcStatuses,
        total,
        passed,
        failed,
        blocked,
        pending,
        executed,
        verdict,
        verdictTone,
        pct,
      }
    })
  }, [requirements, tcById, latestStatusMap])

  // Apply filters
  const filtered = useMemo(() => {
    return rows.filter(({ req, total, verdict }) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase()
        const key = (req.key || '').toLowerCase()
        const title = (req.title || '').toLowerCase()
        if (!key.includes(q) && !title.includes(q)) return false
      }
      // Priority filter
      if (priorityFilter !== 'All' && req.priority !== priorityFilter) return false
      // Coverage filter
      if (coverageFilter === 'Uncovered' && total !== 0) return false
      if (coverageFilter === 'Covered' && total === 0) return false
      if (coverageFilter === 'Failing' && verdict !== 'Failing' && verdict !== 'Blocked') return false
      if (coverageFilter === 'Verified' && verdict !== 'Verified') return false
      return true
    })
  }, [rows, search, priorityFilter, coverageFilter])

  // Summary stats
  const totalReqs = rows.length
  const uncovered = rows.filter((r) => r.total === 0).length
  const covered = totalReqs - uncovered
  const verified = rows.filter((r) => r.verdict === 'Verified').length
  const failing = rows.filter((r) => r.verdict === 'Failing' || r.verdict === 'Blocked').length
  const verifiedPct = totalReqs ? Math.round((verified / totalReqs) * 100) : 0

  return (
    <>
      <PageHeader
        backTo={`/projects/${projectId}`}
        title="Coverage Matrix"
        description="Requirement-to-test-case coverage overview with latest execution status."
      />

      {/* Summary Strip */}
      {totalReqs > 0 && (
        <section className="tp-summary-strip cov-summary-strip">
          <div className="tp-summary-card">
            <span className="tp-summary-label">Total</span>
            <span className="tp-summary-value">{totalReqs}</span>
            <span className="tp-summary-sub">requirements</span>
          </div>
          <div className="tp-summary-divider" />
          <button
            type="button"
            className={`tp-summary-card cov-filter-card${coverageFilter === 'Verified' ? ' cov-filter-card--active' : ''}`}
            onClick={() => setCoverageFilter(coverageFilter === 'Verified' ? 'All' : 'Verified')}
          >
            <span className="tp-summary-label">Verified</span>
            <span className="tp-summary-value tp-summary-value--rate">{verifiedPct}%</span>
            <span className="tp-summary-sub">{verified} of {totalReqs}</span>
          </button>
          <div className="tp-summary-divider" />
          <button
            type="button"
            className={`tp-summary-card cov-filter-card${coverageFilter === 'Covered' ? ' cov-filter-card--active' : ''}`}
            onClick={() => setCoverageFilter(coverageFilter === 'Covered' ? 'All' : 'Covered')}
          >
            <span className="tp-summary-label">Covered</span>
            <span className="tp-summary-value">{covered}</span>
            <span className="tp-summary-sub">have test cases</span>
          </button>
          <div className="tp-summary-divider" />
          <button
            type="button"
            className={`tp-summary-card cov-filter-card${coverageFilter === 'Uncovered' ? ' cov-filter-card--active' : ''}`}
            onClick={() => setCoverageFilter(coverageFilter === 'Uncovered' ? 'All' : 'Uncovered')}
          >
            <span className="tp-summary-label">Uncovered</span>
            <span className="tp-summary-value" style={{ color: uncovered > 0 ? 'var(--danger, #dc2626)' : undefined }}>{uncovered}</span>
            <span className="tp-summary-sub">no test cases</span>
          </button>
          <div className="tp-summary-divider" />
          <button
            type="button"
            className={`tp-summary-card cov-filter-card${coverageFilter === 'Failing' ? ' cov-filter-card--active' : ''}`}
            onClick={() => setCoverageFilter(coverageFilter === 'Failing' ? 'All' : 'Failing')}
          >
            <span className="tp-summary-label">Failing</span>
            <span className="tp-summary-value" style={{ color: failing > 0 ? 'var(--danger, #dc2626)' : undefined }}>{failing}</span>
            <span className="tp-summary-sub">need attention</span>
          </button>
        </section>
      )}

      <section className="panel">
        <div className="section-header">
          <h2>Requirements Matrix</h2>
          {totalReqs > 0 && <StatusPill tone="neutral">{filtered.length} of {totalReqs}</StatusPill>}
        </div>

        {totalReqs > 0 && (
          <div className="toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Search by key or title…"
              aria-label="Search requirements"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: '1 1 200px' }}
            />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className={priorityFilter !== 'All' ? 'filter-active' : ''}
            >
              <option value="All">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={coverageFilter}
              onChange={(e) => setCoverageFilter(e.target.value)}
              aria-label="Filter by coverage"
              className={coverageFilter !== 'All' ? 'filter-active' : ''}
            >
              <option value="All">All coverage</option>
              <option value="Uncovered">Uncovered</option>
              <option value="Covered">Covered</option>
              <option value="Failing">Failing</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        )}

        {totalReqs === 0 ? (
          <div className="empty-state">
            <div className="req-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            </div>
            <h3>No requirements yet</h3>
            <p>Add requirements in the Requirements page to see coverage here.</p>
            <Link to={`/projects/${projectId}/requirements`} className="primary-button" style={{ textDecoration: 'none' }}>
              Go to Requirements
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p className="muted-text">No requirements match your filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="cov-matrix-table">
              <colgroup>
                <col className="cov-col-key" />
                <col className="cov-col-title" />
                <col className="cov-col-priority" />
                <col className="cov-col-cases" />
                <col className="cov-col-statuses" />
                <col className="cov-col-progress" />
                <col className="cov-col-verdict" />
              </colgroup>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Requirement</th>
                  <th>Priority</th>
                  <th>Cases</th>
                  <th>Latest Statuses</th>
                  <th>Pass rate</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ req, tcStatuses, total, passed, failed, blocked, pending, verdict, verdictTone, pct }) => (
                  <>
                    <tr
                      key={req.id}
                      className={`cov-matrix-row ${
                        total === 0 ? 'cov-row--uncovered'
                        : verdict === 'Failing' || verdict === 'Blocked' ? 'cov-row--failing'
                        : verdict === 'Verified' ? 'cov-row--verified'
                        : ''
                      }`}
                    >
                      <td className="mono tc-id">
                        <Link className="text-link" to={`/projects/${projectId}/requirements/${req.id}`}>
                          {req.key || 'View'}
                        </Link>
                      </td>
                      <td className="title-cell">
                        <Link
                          className="text-link"
                          to={`/projects/${projectId}/requirements/${req.id}`}
                          style={{ fontWeight: 700, textDecoration: 'none' }}
                        >
                          {req.title}
                        </Link>
                        {req.description && (
                          <p className="req-desc" style={{ marginTop: '2px', fontSize: '11.5px' }}>{req.description}</p>
                        )}
                      </td>
                      <td>
                        <span className={`tp-tag tp-tag--${(req.priority || 'Medium').toLowerCase() === 'high' ? 'danger' : (req.priority || 'Medium').toLowerCase() === 'low' ? 'neutral' : 'pending'}`}>
                          {req.priority || 'Medium'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {total === 0 ? (
                          <span style={{ color: 'var(--danger, #dc2626)', fontWeight: 700 }}>0</span>
                        ) : (
                          <span className="tp-rate-num">{total}</span>
                        )}
                      </td>
                      <td>
                        {tcStatuses.length === 0 ? (
                          <span className="muted-text">—</span>
                        ) : (
                          <div className="cov-status-chips">
                            {passed > 0 && (
                              <Link to={`/projects/${projectId}/test-cases?status=Pass`} className="cov-chip cov-chip--passed" title={`${passed} passed — view passed cases`}>
                                <span className="cov-chip-dot cov-chip-dot--passed" />
                                {passed} Pass
                              </Link>
                            )}
                            {failed > 0 && (
                              <Link to={`/projects/${projectId}/test-cases?status=Fail`} className="cov-chip cov-chip--failed" title={`${failed} failed — view failed cases`}>
                                <span className="cov-chip-dot cov-chip-dot--failed" />
                                {failed} Fail
                              </Link>
                            )}
                            {blocked > 0 && (
                              <Link to={`/projects/${projectId}/test-cases?status=Blocker`} className="cov-chip cov-chip--blocker" title={`${blocked} blocked — view blocked cases`}>
                                <span className="cov-chip-dot cov-chip-dot--blocker" />
                                {blocked} Block
                              </Link>
                            )}
                            {pending > 0 && (
                              <Link to={`/projects/${projectId}/test-cases?status=${enc('Not Executed')}`} className="cov-chip cov-chip--pending" title={`${pending} not executed`}>
                                <span className="cov-chip-dot cov-chip-dot--pending" />
                                {pending} Pend
                              </Link>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {total > 0 ? (
                          <div className="seg-progress">
                            <div className="seg-bar">
                              <span className="seg-pass" style={{ width: `${Math.round((passed / total) * 100)}%` }} />
                              <span className="seg-fail" style={{ width: `${Math.round((failed / total) * 100)}%` }} />
                              <span className="seg-block" style={{ width: `${Math.round((blocked / total) * 100)}%` }} />
                            </div>
                            <span className="seg-pct">{pct}% pass</span>
                          </div>
                        ) : (
                          <span className="muted-text">—</span>
                        )}
                      </td>
                      <td>
                        <div className="cov-verdict-cell">
                          <StatusPill tone={verdictTone}>{verdict}</StatusPill>
                          {total > 0 && (
                            <button
                              className="cov-expand-btn"
                              type="button"
                              onClick={() => toggleExpand(req.id)}
                              title={expandedReqId === req.id ? 'Collapse' : 'Show test cases'}
                              aria-label={expandedReqId === req.id ? 'Collapse' : 'Show test cases'}
                            >
                              {expandedReqId === req.id ? '▲' : '▼'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedReqId === req.id && (
                      <tr key={`${req.id}-expanded`} className="cov-expanded-row">
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className="cov-expanded-inner">
                            <table className="cov-tc-table">
                              <thead>
                                <tr>
                                  <th>TC ID</th>
                                  <th>Title</th>
                                  <th>Module</th>
                                  <th>Priority</th>
                                  <th>Latest Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tcStatuses.map(({ tc, status }) => (
                                  <tr key={tc.id} className={status === 'Fail' ? 'cov-tc-row--fail' : status === 'Blocker' ? 'cov-tc-row--block' : status === 'Pass' ? 'cov-tc-row--pass' : ''}>
                                    <td className="mono tc-id">{tc.sourceTcId || tc.id.slice(0, 8).toUpperCase()}</td>
                                    <td>
                                      <Link className="text-link" to={`/projects/${projectId}/test-cases/${tc.id}`}>{tc.title}</Link>
                                    </td>
                                    <td>{tc.module || '—'}</td>
                                    <td>{tc.priority || '—'}</td>
                                    <td>
                                      <span className={`status-pill status-pill--${STATUS_TONE[status] ?? 'pending'}`}>{status}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </section>
    </>
  )
}
