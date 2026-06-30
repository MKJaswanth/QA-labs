import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { Modal } from '../components/Modal'
import { useRequirements } from '../hooks/useRequirements'
import { useTestCases } from '../hooks/useTestCases'
import { useBugs } from '../hooks/useBugs'
import { useTestRuns } from '../hooks/useTestRuns'
import { RequirementBulkUploadModal } from '../components/RequirementBulkUploadModal'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { useUser } from '../context/UserContext'
import { normalizeTestStatus, TEST_STATUSES, STATUS_TONE } from '../utils/status'
import { withHistory, historyEntry } from '../utils/history'
import { useUserRole } from '../hooks/useUserRole'
import { requirementMatchesSearch } from '../utils/entitySearch'
import { testCaseMatchesSearch } from '../utils/testCaseSearch'

const PRIORITIES = ['High', 'Medium', 'Low']

const blankForm = () => ({ key: '', title: '', description: '', priority: 'Medium', testCaseIds: [] })

function TcPickerSection({ form, testCases, tcFolders, tcFolderFilter, setTcFolderFilter, availableFolders, addFolder, removeFolder, fullySelectedFolders, tcModules, tcSearch, setTcSearch, tcModuleFilter, setTcModuleFilter, filteredTcs, toggleTc, addModule, removeModule, fullySelectedModules, availableModules }) {
  return (
    <div>
      <label>Linked test cases <span className="hint">({form.testCaseIds.length} selected)</span></label>

      <div className="req-module-add-row">
        {availableFolders.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) addFolder(e.target.value) }}
            aria-label="Add all cases from a folder"
            className="req-module-add-select"
          >
            <option value="">+ Add by folder…</option>
            {availableFolders.map((f) => {
              const count = testCases.filter((tc) => (tc.folder || '') === f).length
              return <option key={f} value={f}>{f} ({count} cases)</option>
            })}
          </select>
        )}
        {availableModules.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) addModule(e.target.value) }}
            aria-label="Add all cases from a module"
            className="req-module-add-select"
          >
            <option value="">+ Add by module…</option>
            {availableModules.map((m) => {
              const count = testCases.filter((tc) => tc.module === m).length
              return <option key={m} value={m}>{m} ({count} cases)</option>
            })}
          </select>
        )}
      </div>

      {(fullySelectedFolders.length > 0 || fullySelectedModules.length > 0) && (
        <div className="req-module-chips">
          {fullySelectedFolders.map((f) => {
            const count = testCases.filter((tc) => (tc.folder || '') === f).length
            return (
              <span key={`folder:${f}`} className="req-module-chip req-folder-chip">
                <span className="req-module-chip-name">📁 {f}</span>
                <span className="req-module-chip-count">{count}</span>
                <button type="button" className="req-module-chip-remove" onClick={() => removeFolder(f)} aria-label={`Remove folder ${f}`}>×</button>
              </span>
            )
          })}
          {fullySelectedModules.map((m) => {
            const count = testCases.filter((tc) => tc.module === m).length
            return (
              <span key={m} className="req-module-chip">
                <span className="req-module-chip-name">{m}</span>
                <span className="req-module-chip-count">{count}</span>
                <button type="button" className="req-module-chip-remove" onClick={() => removeModule(m)} aria-label={`Remove ${m}`}>×</button>
              </span>
            )
          })}
        </div>
      )}

      <div className="req-tc-toolbar">
        <input
          value={tcSearch}
          onChange={(e) => setTcSearch(e.target.value)}
          placeholder="Search test cases…"
          className="req-tc-search"
        />
        {tcFolders.length > 0 && (
          <select
            value={tcFolderFilter}
            onChange={(e) => { setTcFolderFilter(e.target.value); setTcModuleFilter('') }}
            className={`req-tc-module-select${tcFolderFilter ? ' filter-active' : ''}`}
            aria-label="Filter by folder"
          >
            <option value="">All folders</option>
            {tcFolders.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {tcModules.length > 0 && (
          <select
            value={tcModuleFilter}
            onChange={(e) => setTcModuleFilter(e.target.value)}
            className={`req-tc-module-select${tcModuleFilter ? ' filter-active' : ''}`}
            aria-label="Filter by module"
          >
            <option value="">All modules</option>
            {tcModules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {(tcFolderFilter || tcModuleFilter) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {tcFolderFilter && (
            <span className="req-tc-active-filter">
              Folder: {tcFolderFilter}
              <button type="button" className="req-tc-filter-clear" onClick={() => { setTcFolderFilter(''); setTcModuleFilter('') }} aria-label="Clear folder filter">×</button>
            </span>
          )}
          {tcModuleFilter && (
            <span className="req-tc-active-filter">
              Module: {tcModuleFilter}
              <button type="button" className="req-tc-filter-clear" onClick={() => setTcModuleFilter('')} aria-label="Clear module filter">×</button>
            </span>
          )}
        </div>
      )}

      <div className="req-tc-picker">
        {testCases.length === 0 ? (
          <p className="panel-empty-text">No test cases in this project yet.</p>
        ) : filteredTcs.length === 0 ? (
          <p className="panel-empty-text">No matches.</p>
        ) : (
          filteredTcs.map((tc) => (
            <label key={tc.id} className="req-tc-option">
              <input
                className="row-checkbox"
                type="checkbox"
                checked={form.testCaseIds.includes(tc.id)}
                onChange={() => toggleTc(tc.id)}
              />
              <span className="mono req-tc-id">{tc.sourceTcId || tc.id.slice(0, 8).toUpperCase()}</span>
              <span className="req-tc-title" title={tc.title}>{tc.title}</span>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

// Coverage verdict for a requirement — uses latest run status, falls back to tc.status.
function coverageOf(req, tcById, runStatusMap = {}) {
  const linked = (req.testCaseIds || []).map((id) => tcById.get(id)).filter(Boolean)
  const total = linked.length
  const getStatus = (tc) => normalizeTestStatus(runStatusMap[tc.id] || tc.status)
  const passed  = linked.filter((t) => getStatus(t) === 'Pass').length
  const failed  = linked.filter((t) => ['Fail', 'Blocker'].includes(getStatus(t))).length
  const skipped = linked.filter((t) => getStatus(t) === 'Skipped').length
  const pending = linked.filter((t) => getStatus(t) === 'Not Executed').length
  // Verified: no failures AND every non-skipped TC has passed (skipped don't block verification)
  const isVerified = total > 0 && failed === 0 && passed > 0 && (passed + skipped) === total
  let verdict
  if (total === 0)  verdict = { label: 'Not covered', tone: 'failed' }
  else if (failed > 0)  verdict = { label: 'Failing', tone: 'failed' }
  else if (isVerified)  verdict = { label: 'Verified', tone: 'passed' }
  else                  verdict = { label: 'In progress', tone: 'pending' }
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0
  return { linked, total, passed, failed, skipped, pending, verdict, pct }
}

export function RequirementsPage() {
  const { projectId, requirementId } = useParams()
  const { requirements, addRequirement, updateRequirement, removeRequirement } = useRequirements(projectId)
  const { testCases, updateTestCase } = useTestCases(projectId)
  const { bugs } = useBugs(projectId)
  const { runs } = useTestRuns(projectId)
  const { isLead } = useUserRole()
  const { user } = useUser()
  const confirm = useConfirm()
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankForm)
  const [tcSearch, setTcSearch] = useState('')
  const [tcFolderFilter, setTcFolderFilter] = useState('')
  const [tcModuleFilter, setTcModuleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)

  const tcById = useMemo(() => new Map(testCases.map((tc) => [tc.id, tc])), [testCases])

  // Build latest-run status map so coverage stats reflect actual run results.
  const runStatusMap = useMemo(() => {
    const sorted = [...runs].sort(
      (a, b) => new Date(a.completedAt || a.startedAt || 0) - new Date(b.completedAt || b.startedAt || 0)
    )
    const map = {}
    sorted.forEach((run) => {
      ;(run.cases || []).forEach((rc) => { if (rc.testCaseId) map[rc.testCaseId] = rc.status })
    })
    return map
  }, [runs])

  // Newest requirements first — wrapped in useMemo so stats stay reactive to run/tc changes.
  const rows = useMemo(() => (
    [...requirements]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((req) => ({ req, cov: coverageOf(req, tcById, runStatusMap) }))
  ), [requirements, tcById, runStatusMap])

  const filteredRows = useMemo(() => {
    return rows.filter(({ req }) => requirementMatchesSearch(req, search))
  }, [rows, search])

  const totalReqs      = rows.length
  const coveredReqs    = rows.filter((r) => r.cov.total > 0).length
  const verifiedReqs   = rows.filter((r) => r.cov.verdict.label === 'Verified').length
  const failingReqs    = rows.filter((r) => r.cov.verdict.label === 'Failing').length
  const inProgressReqs = rows.filter((r) => r.cov.verdict.label === 'In progress').length
  const uncoveredCount = rows.filter((r) => r.cov.total === 0).length
  const verifiedPct    = totalReqs ? Math.round((verifiedReqs / totalReqs) * 100) : 0

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openAdd = () => { setEditing(null); setForm(blankForm()); setTcSearch(''); setTcFolderFilter(''); setTcModuleFilter(''); setShowForm(true) }
  const openEdit = (req) => {
    setEditing(req)
    setForm({
      key: req.key || '',
      title: req.title || '',
      description: req.description || '',
      priority: req.priority || 'Medium',
      testCaseIds: req.testCaseIds || [],
    })
    setTcSearch('')
    setTcFolderFilter('')
    setTcModuleFilter('')
    setShowForm(true)
  }

  const toggleTc = (id) => setForm((f) => ({
    ...f,
    testCaseIds: f.testCaseIds.includes(id) ? f.testCaseIds.filter((x) => x !== id) : [...f.testCaseIds, id],
  }))

  const addFolder = (folderName) => {
    const ids = testCases.filter((tc) => (tc.folder || '') === folderName).map((tc) => tc.id)
    setForm((f) => ({ ...f, testCaseIds: [...new Set([...f.testCaseIds, ...ids])] }))
  }

  const removeFolder = (folderName) => {
    const ids = new Set(testCases.filter((tc) => (tc.folder || '') === folderName).map((tc) => tc.id))
    setForm((f) => ({ ...f, testCaseIds: f.testCaseIds.filter((id) => !ids.has(id)) }))
  }

  const addModule = (moduleName) => {
    const moduleIds = testCases.filter((tc) => tc.module === moduleName).map((tc) => tc.id)
    setForm((f) => ({ ...f, testCaseIds: [...new Set([...f.testCaseIds, ...moduleIds])] }))
  }

  const removeModule = (moduleName) => {
    const moduleIds = new Set(testCases.filter((tc) => tc.module === moduleName).map((tc) => tc.id))
    setForm((f) => ({ ...f, testCaseIds: f.testCaseIds.filter((id) => !moduleIds.has(id)) }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (editing) {
      updateRequirement({ ...editing, ...form, title: form.title.trim() })
      toast.success('Requirement updated')
    } else {
      addRequirement({ ...form, title: form.title.trim() })
      toast.success('Requirement added')
    }
    setShowForm(false)
  }

  const handleDelete = async (req) => {
    const ok = await confirm({
      title: 'Delete requirement?',
      message: `"${req.title}" will be removed. Linked test cases are not affected.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) { removeRequirement(req.id); toast.success('Requirement deleted') }
  }

  // Unique folder and module values for the picker filter
  const tcFolders = useMemo(() => [...new Set(testCases.map((t) => t.folder).filter(Boolean))].sort(), [testCases])
  const tcModules = useMemo(() => {
    const base = tcFolderFilter ? testCases.filter((tc) => (tc.folder || '') === tcFolderFilter) : testCases
    return [...new Set(base.map((t) => t.module).filter(Boolean))].sort()
  }, [testCases, tcFolderFilter])

  // Folders where every test case is already selected
  const fullySelectedFolders = useMemo(
    () => tcFolders.filter((f) => {
      const fCases = testCases.filter((tc) => (tc.folder || '') === f)
      return fCases.length > 0 && fCases.every((tc) => form.testCaseIds.includes(tc.id))
    }),
    [tcFolders, testCases, form.testCaseIds],
  )

  const availableFolders = useMemo(
    () => tcFolders.filter((f) => !fullySelectedFolders.includes(f)),
    [tcFolders, fullySelectedFolders],
  )

  // Modules where every test case is already in form.testCaseIds
  const fullySelectedModules = useMemo(
    () => tcModules.filter((m) => {
      const mCases = testCases.filter((tc) => tc.module === m)
      return mCases.length > 0 && mCases.every((tc) => form.testCaseIds.includes(tc.id))
    }),
    [tcModules, testCases, form.testCaseIds],
  )

  const availableModules = useMemo(
    () => tcModules.filter((m) => !fullySelectedModules.includes(m)),
    [tcModules, fullySelectedModules],
  )

  const filteredTcs = useMemo(() => {
    const matched = testCases.filter((tc) => {
      if (!testCaseMatchesSearch(tc, tcSearch)) return false
      if (tcFolderFilter && (tc.folder || '') !== tcFolderFilter) return false
      if (tcModuleFilter && tc.module !== tcModuleFilter) return false
      return true
    })
    // Sort by sourceTcId ascending (TC-XX-001, TC-XX-002…)
    return [...matched].sort((a, b) => {
      const idA = a.sourceTcId || ''
      const idB = b.sourceTcId || ''
      return idA.localeCompare(idB)
    })
  }, [testCases, tcSearch, tcModuleFilter])

  if (requirementId) {
    const detail = rows.find(({ req }) => req.id === requirementId)
    if (!detail) {
      return (
        <>
          <PageHeader
            title="Requirement not found"
            description="This requirement may have been deleted or is no longer available."
            action={<Link to={`/projects/${projectId}/requirements`} className="secondary-button">Back to requirements</Link>}
          />
          <section className="empty-state">
            <h2>No matching requirement</h2>
            <p>Open the requirements list to review current coverage records.</p>
          </section>
        </>
      )
    }

    const { req, cov } = detail
    const linkedBugs = bugs.filter((b) => b.linkedRequirementId === req.id)
    return (
      <>
        <PageHeader
          title={req.key ? `${req.key}: ${req.title}` : req.title}
          description="Requirement coverage details and linked test cases."
          action={
            <div className="page-actions-row">
              <Link to={`/projects/${projectId}/requirements`} className="secondary-button">Back</Link>
              {cov.total > 0 && isLead && (
                <Link 
                  to={`/projects/${projectId}/test-runs?runCases=${cov.linked.map(tc => tc.id).join(',')}&reqId=${req.id}&reqKey=${encodeURIComponent(req.key || '')}&reqTitle=${encodeURIComponent(req.title)}`} 
                  className="primary-button"
                  style={{ textDecoration: 'none' }}
                >
                  Run linked tests ({cov.total})
                </Link>
              )}
              <button className="secondary-button" type="button" onClick={() => openEdit(req)}>Edit requirement</button>
            </div>
          }
        />

        <section className="panel req-detail-page">
          <div className="req-detail-header">
            <div>
              <span className="mono tc-id">{req.key || 'Requirement'}</span>
              <h2>{req.title}</h2>
              {req.description && <p className="req-detail-desc">{req.description}</p>}
            </div>
            <StatusPill tone={cov.verdict.tone}>{cov.verdict.label}</StatusPill>
          </div>

          <div className="req-detail-meta">
            <div><span>Priority</span><strong>{req.priority || 'Medium'}</strong></div>
            <div><span>Linked cases</span><strong>{cov.total}</strong></div>
            <div><span>Passed</span><strong>{cov.passed}</strong></div>
            <div><span>Failed/blocking</span><strong>{cov.failed}</strong></div>
            <div><span>Progress</span><strong>{cov.pct}%</strong></div>
          </div>

          <div className="req-progress-cell req-detail-progress">
            <div className="req-progress-track">
              <span className="req-progress-fill" style={{ width: `${cov.pct}%` }} />
            </div>
            <span className="req-progress-pct">{cov.pct}%</span>
          </div>

          <div className="section-header req-detail-section-head">
            <h2>Linked test cases</h2>
            <StatusPill tone="neutral">{cov.total}</StatusPill>
          </div>

          {cov.linked.length === 0 ? (
            <div className="req-detail-empty">
              <p>No test cases are linked yet. Edit this requirement to add coverage.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>TC ID</th>
                    <th>Title</th>
                    <th>Module</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cov.linked.map((tc) => (
                    <tr key={tc.id}>
                      <td className="mono tc-id">{tc.sourceTcId || tc.id.slice(0, 8).toUpperCase()}</td>
                      <td><Link className="text-link" to={`/projects/${projectId}/test-cases/${tc.id}`}>{tc.title}</Link></td>
                      <td>{tc.module || '—'}</td>
                      <td>{tc.priority || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`inline-select status-select status-select--${STATUS_TONE[tc.status] ?? 'pending'}`}
                          value={tc.status || 'Not Executed'}
                          aria-label={`Status for ${tc.title}`}
                          onChange={(e) => updateTestCase(withHistory(
                            { ...tc, status: e.target.value, updatedAt: new Date().toISOString() },
                            historyEntry('status', user, `Status changed to ${e.target.value}`, tc.status, e.target.value),
                          ))}
                        >
                          {TEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-header req-detail-section-head">
            <h2>Linked bugs</h2>
            <StatusPill tone="neutral">{linkedBugs.length}</StatusPill>
          </div>

          {linkedBugs.length === 0 ? (
            <div className="req-detail-empty">
              <p>No bugs linked to this requirement yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Bug ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedBugs.map((bug) => (
                    <tr key={bug.id}>
                      <td className="mono tc-id">{bug.sourceBugId || bug.id.slice(0, 8).toUpperCase()}</td>
                      <td><Link className="text-link" to={`/projects/${projectId}/bugs`}>{bug.title}</Link></td>
                      <td>{bug.severity || '—'}</td>
                      <td><StatusPill tone={bug.status === 'Closed' ? 'passed' : 'failed'}>{bug.status}</StatusPill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <Modal title={editing ? 'Edit requirement' : 'New requirement'} onClose={() => setShowForm(false)}>
            <form className="modal-form" onSubmit={submit}>
              <div className="form-row">
                <label>
                  Key
                  <input value={form.key} onChange={set('key')} placeholder="REQ-001 (optional)" />
                </label>
                <label>
                  Priority
                  <select value={form.priority} onChange={set('priority')}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <label>
                Title <span className="required">*</span>
                <input autoFocus value={form.title} onChange={set('title')} placeholder="User can reset password via email" />
              </label>
              <label>
                Description
                <textarea rows={3} value={form.description} onChange={set('description')} placeholder="What this requirement means / acceptance criteria…" />
              </label>
              <TcPickerSection
                form={form}
                testCases={testCases}
                tcFolders={tcFolders}
                tcFolderFilter={tcFolderFilter}
                setTcFolderFilter={setTcFolderFilter}
                availableFolders={availableFolders}
                addFolder={addFolder}
                removeFolder={removeFolder}
                fullySelectedFolders={fullySelectedFolders}
                tcModules={tcModules}
                tcSearch={tcSearch}
                setTcSearch={setTcSearch}
                tcModuleFilter={tcModuleFilter}
                setTcModuleFilter={setTcModuleFilter}
                filteredTcs={filteredTcs}
                toggleTc={toggleTc}
                addModule={addModule}
                removeModule={removeModule}
                fullySelectedModules={fullySelectedModules}
                availableModules={availableModules}
              />
              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={!form.title.trim()}>
                  {editing ? 'Save' : 'Add requirement'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        backTo={`/projects`}
        title="Requirements"
        description="Track which features are covered by tests and whether they pass."
        action={
          <div className="page-actions-row">
            <button className="secondary-button" type="button" onClick={() => setShowImport(true)}>Import CSV</button>
            <button className="primary-button" type="button" onClick={openAdd}>+ Add requirement</button>
          </div>
        }
      />

      {totalReqs > 0 && (
        <section className="req-coverage-strip">
          <div className="req-coverage-summary">
            <div className="req-coverage-hero">
              <span className="req-coverage-rate">{verifiedPct}<span className="req-coverage-pct">%</span></span>
              <div className="req-coverage-meta">
                <strong>verified</strong>
                <span>{verifiedReqs} of {totalReqs} requirements</span>
              </div>
            </div>
            <div className="req-coverage-bar">
              {verifiedReqs > 0 && <span className="req-coverage-seg req-coverage-seg--verified" style={{ flex: verifiedReqs }} title={`Verified: ${verifiedReqs}`} />}
              {inProgressReqs > 0 && <span className="req-coverage-seg req-coverage-seg--inprogress" style={{ flex: inProgressReqs }} title={`In progress: ${inProgressReqs}`} />}
              {failingReqs > 0 && <span className="req-coverage-seg req-coverage-seg--failing" style={{ flex: failingReqs }} title={`Failing: ${failingReqs}`} />}
              {uncoveredCount > 0 && <span className="req-coverage-seg req-coverage-seg--uncovered" style={{ flex: uncoveredCount }} title={`Uncovered: ${uncoveredCount}`} />}
            </div>
          </div>
          <div className="req-coverage-stats">
            <div className="req-stat req-stat--total">
              <strong>{totalReqs}</strong>
              <span className="req-stat-label">Total</span>
            </div>
            <div className="req-stat req-stat--covered">
              <strong>{coveredReqs}</strong>
              <span className="req-stat-label">Covered</span>
            </div>
            <div className="req-stat req-stat--verified">
              <strong className={verifiedReqs > 0 ? 'req-stat-val--good' : ''}>{verifiedReqs}</strong>
              <span className="req-stat-label">Verified</span>
            </div>
            <div className="req-stat req-stat--inprogress">
              <strong>{inProgressReqs}</strong>
              <span className="req-stat-label">In Progress</span>
            </div>
            <div className="req-stat req-stat--failing">
              <strong className={failingReqs > 0 ? 'req-stat-val--bad' : ''}>{failingReqs}</strong>
              <span className="req-stat-label">Failing</span>
            </div>
            <div className="req-stat req-stat--uncovered">
              <strong>{uncoveredCount}</strong>
              <span className="req-stat-label">Uncovered</span>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-header">
          <h2>Requirements</h2>
          {totalReqs > 0 && <StatusPill tone="neutral">{totalReqs}</StatusPill>}
        </div>
        {totalReqs > 0 && (
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search requirements…"
              aria-label="Search requirements"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

          </div>
        )}
        {totalReqs === 0 ? (
          <div className="req-empty-state">
            <div className="req-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            </div>
            <h3>No requirements yet</h3>
            <p>Add your first requirement and link the test cases that verify it.</p>
            <button className="primary-button" type="button" onClick={openAdd}>Add your first requirement</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="req-table">
              <colgroup>
                <col className="req-col-key" />
                <col className="req-col-title" />
                <col className="req-col-priority" />
                <col className="req-col-coverage" />
                <col className="req-col-bar" />
                <col className="req-col-status" />
                <col className="req-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Requirement</th>
                  <th>Priority</th>
                  <th>Coverage</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th className="row-actions"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <span className="empty-table-message">No requirements match your search.</span>
                    </td>
                  </tr>
                ) : filteredRows.map(({ req, cov }) => (
                  <tr key={req.id}>
                    <td className="mono tc-id req-col-key-cell">
                      <Link className="text-link" to={`/projects/${projectId}/requirements/${req.id}`}>
                        {req.key || 'View'}
                      </Link>
                    </td>
                    <td className="title-cell req-col-title-cell">
                      <Link className="text-link" to={`/projects/${projectId}/requirements/${req.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>
                        {req.title}
                      </Link>
                      {req.description && <p className="req-desc" style={{ marginTop: '4px' }}>{req.description}</p>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`inline-select status-select priority-${(req.priority || 'medium').toLowerCase()}`}
                        value={req.priority || 'Medium'}
                        aria-label="Requirement priority"
                        onChange={(e) => updateRequirement({ ...req, priority: e.target.value })}
                      >
                        {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </td>
                    <td>
                      {cov.total === 0
                        ? <span className="req-cov-none">No cases</span>
                        : <span className="req-cov-text">{cov.total} case{cov.total !== 1 ? 's' : ''} · {cov.passed} pass{cov.failed ? ` · ${cov.failed} fail` : ''}</span>
                      }
                    </td>
                    <td>
                      {cov.total > 0 ? (
                        <div className="req-progress-cell">
                          <div className="req-progress-track">
                            <span className="req-progress-fill" style={{ width: `${cov.pct}%` }} />
                          </div>
                          <span className="req-progress-pct">{cov.pct}%</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td><StatusPill tone={cov.verdict.tone}>{cov.verdict.label}</StatusPill></td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions-inner">
                        {cov.total > 0 && isLead && (
                          <Link 
                            className="icon-btn-action" 
                            to={`/projects/${projectId}/test-runs?runCases=${cov.linked.map(tc => tc.id).join(',')}&reqId=${req.id}&reqKey=${encodeURIComponent(req.key || '')}&reqTitle=${encodeURIComponent(req.title)}`} 
                            title="Run linked tests"
                            aria-label="Run linked tests"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3" fill="#10b981" />
                            </svg>
                          </Link>
                        )}
                        <button className="icon-btn-action" type="button" aria-label="Edit requirement" title="Edit" onClick={() => openEdit(req)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="icon-btn-action text-danger" type="button" aria-label="Delete requirement" title="Delete" onClick={() => handleDelete(req)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <Modal title={editing ? 'Edit requirement' : 'New requirement'} onClose={() => setShowForm(false)}>
          <form className="modal-form" onSubmit={submit}>
            <div className="form-row">
              <label>
                Key
                <input value={form.key} onChange={set('key')} placeholder="REQ-001 (optional)" />
              </label>
              <label>
                Priority
                <select value={form.priority} onChange={set('priority')}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <label>
              Title <span className="required">*</span>
              <input autoFocus value={form.title} onChange={set('title')} placeholder="User can reset password via email" />
            </label>
            <label>
              Description
              <textarea rows={3} value={form.description} onChange={set('description')} placeholder="What this requirement means / acceptance criteria…" />
            </label>
            <TcPickerSection
              form={form}
              testCases={testCases}
              tcFolders={tcFolders}
              tcFolderFilter={tcFolderFilter}
              setTcFolderFilter={setTcFolderFilter}
              availableFolders={availableFolders}
              addFolder={addFolder}
              removeFolder={removeFolder}
              fullySelectedFolders={fullySelectedFolders}
              tcModules={tcModules}
              tcSearch={tcSearch}
              setTcSearch={setTcSearch}
              tcModuleFilter={tcModuleFilter}
              setTcModuleFilter={setTcModuleFilter}
              filteredTcs={filteredTcs}
              toggleTc={toggleTc}
              addModule={addModule}
              removeModule={removeModule}
              fullySelectedModules={fullySelectedModules}
              availableModules={availableModules}
            />
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={!form.title.trim()}>
                {editing ? 'Save' : 'Add requirement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <RequirementBulkUploadModal
        open={showImport}
        onClose={() => setShowImport(false)}
        testCases={testCases}
        projectId={projectId}
        onImport={(data) => addRequirement(data)}
      />
    </>
  )
}
