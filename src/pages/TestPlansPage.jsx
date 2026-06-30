import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { Modal } from '../components/Modal'
import { useTestPlans } from '../hooks/useTestPlans'
import { useMilestones } from '../hooks/useMilestones'
import { useTestRuns } from '../hooks/useTestRuns'
import { useBugs } from '../hooks/useBugs'
import { useRequirements } from '../hooks/useRequirements'
import { useTestCases } from '../hooks/useTestCases'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { PencilIcon, XIcon, PlayIcon, CheckIcon } from '../components/Icons'
import { getPlanMetrics, getMilestoneMetrics, getPlanTestCases } from '../utils/planMetrics'
import { normalizeTestStatus, TEST_STATUSES, STATUS_TONE } from '../utils/status'

const PLAN_STATUSES = ['Open', 'Completed']
const MILESTONE_STATUSES = ['Open', 'Completed']

function SegBar({ total, passed, failed, blocked, pct }) {
  if (!total) return <div className="seg-progress"><span className="seg-no-scope">No scope</span></div>
  const passPct = Math.round((passed / total) * 100)
  const failPct = Math.round((failed / total) * 100)
  const blockPct = Math.round((blocked / total) * 100)
  return (
    <div className="seg-progress">
      <div className="seg-bar">
        <span className="seg-pass" style={{ width: `${passPct}%` }} />
        <span className="seg-fail" style={{ width: `${failPct}%` }} />
        <span className="seg-block" style={{ width: `${blockPct}%` }} />
      </div>
      <span className="seg-pct">{pct}% executed</span>
    </div>
  )
}

const blankPlan = () => ({ name: '', description: '', requirementIds: [], milestoneId: '', status: 'Open' })
const blankMilestone = () => ({ name: '', description: '', dueDate: '', testPlanIds: [], status: 'Open' })

export function TestPlansPage() {
  const { projectId } = useParams()
  const { plans, addPlan, updatePlan, removePlan } = useTestPlans(projectId)
  const { milestones, addMilestone, updateMilestone, removeMilestone } = useMilestones(projectId)
  const { runs } = useTestRuns(projectId)
  const { bugs } = useBugs(projectId)
  const { requirements } = useRequirements(projectId)
  const { testCases } = useTestCases(projectId)
  const confirm = useConfirm()
  const toast = useToast()

  const [tab, setTab] = useState('milestones')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [planForm, setPlanForm] = useState(blankPlan())
  const [milestoneForm, setMilestoneForm] = useState(blankMilestone())
  const [planSearch, setPlanSearch] = useState('')
  const [planStatusFilter, setPlanStatusFilter] = useState('')
  const [milestoneSearch, setMilestoneSearch] = useState('')
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState('')

  const planRows = useMemo(() =>
    [...plans]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((plan) => {
        if (planStatusFilter && plan.status !== planStatusFilter) return false
        if (planSearch) {
          const q = planSearch.toLowerCase()
          const milestone = milestones.find((m) => m.id === plan.milestoneId)
          return plan.name.toLowerCase().includes(q) || milestone?.name.toLowerCase().includes(q)
        }
        return true
      })
      .map((plan) => ({ plan, metrics: getPlanMetrics(plan, runs, requirements, testCases, bugs) })),
  [plans, runs, requirements, testCases, bugs, planSearch, planStatusFilter, milestones])

  const milestoneRows = useMemo(() =>
    [...milestones]
      .sort((a, b) => {
        const aDue = a.dueDate || '9999'
        const bDue = b.dueDate || '9999'
        return aDue.localeCompare(bDue)
      })
      .filter((ms) => {
        if (milestoneStatusFilter && ms.status !== milestoneStatusFilter) return false
        if (milestoneSearch) {
          const q = milestoneSearch.toLowerCase()
          return ms.name.toLowerCase().includes(q) || ms.description?.toLowerCase().includes(q)
        }
        return true
      })
      .map((milestone) => ({ milestone, metrics: getMilestoneMetrics(milestone, plans, runs, requirements, testCases, bugs) })),
  [milestones, plans, runs, requirements, testCases, bugs, milestoneSearch, milestoneStatusFilter])

  // Aggregate summary stats
  const summaryStats = useMemo(() => {
    const activePlans = plans.filter(p => p.status !== 'Completed').length
    const completedPlans = plans.filter(p => p.status === 'Completed').length
    const activeMilestones = milestones.filter(m => m.status !== 'Completed').length
    const completedMilestones = milestones.filter(m => m.status === 'Completed').length
    const totalCases = planRows.reduce((sum, { metrics }) => sum + metrics.scopeTotal, 0)
    const totalPassed = planRows.reduce((sum, { metrics }) => sum + metrics.scopePassed, 0)
    const overallPassRate = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0
    return { activePlans, completedPlans, activeMilestones, completedMilestones, totalCases, totalPassed, overallPassRate }
  }, [plans, milestones, planRows])

  const setPlan = (k) => (e) => setPlanForm((f) => ({ ...f, [k]: e.target.value }))
  const setMilestone = (k) => (e) => setMilestoneForm((f) => ({ ...f, [k]: e.target.value }))

  const togglePlanRequirement = (reqId) => setPlanForm((f) => ({
    ...f,
    requirementIds: f.requirementIds.includes(reqId)
      ? f.requirementIds.filter((id) => id !== reqId)
      : [...f.requirementIds, reqId],
  }))

  const toggleMilestonePlan = (planId) => setMilestoneForm((f) => ({
    ...f,
    testPlanIds: f.testPlanIds.includes(planId) ? f.testPlanIds.filter((id) => id !== planId) : [...f.testPlanIds, planId],
  }))

  const openAddPlan = () => { setEditingPlan(null); setPlanForm(blankPlan()); setShowPlanForm(true) }
  const openEditPlan = (plan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name || '',
      description: plan.description || '',
      requirementIds: plan.requirementIds || [],
      milestoneId: plan.milestoneId || '',
      status: plan.status || 'Open',
    })
    setShowPlanForm(true)
  }

  const openAddMilestone = () => { setEditingMilestone(null); setMilestoneForm(blankMilestone()); setShowMilestoneForm(true) }
  const openEditMilestone = (milestone) => {
    setEditingMilestone(milestone)
    const linkedPlanIds = plans.filter((p) => p.milestoneId === milestone.id).map((p) => p.id)
    setMilestoneForm({
      name: milestone.name || '',
      description: milestone.description || '',
      dueDate: milestone.dueDate || '',
      testPlanIds: [...new Set([...(milestone.testPlanIds || []), ...linkedPlanIds])],
      status: milestone.status || 'Open',
    })
    setShowMilestoneForm(true)
  }

  const submitPlan = (e) => {
    e.preventDefault()
    if (!planForm.name.trim()) return
    const payload = { ...planForm, name: planForm.name.trim() }
    if (editingPlan) {
      updatePlan({ ...editingPlan, ...payload })
      toast.success('Test plan updated')
    } else {
      addPlan(payload)
      toast.success('Test plan created')
    }
    setShowPlanForm(false)
  }

  const submitMilestone = (e) => {
    e.preventDefault()
    if (!milestoneForm.name.trim()) return
    const payload = { ...milestoneForm, name: milestoneForm.name.trim() }
    if (editingMilestone) {
      updateMilestone({ ...editingMilestone, ...payload })
      toast.success('Milestone updated')
    } else {
      addMilestone(payload)
      toast.success('Milestone created')
    }
    setShowMilestoneForm(false)
  }

  const handleDeletePlan = async (plan) => {
    const ok = await confirm({
      title: 'Delete test plan?',
      message: `"${plan.name}" will be removed. Linked runs are not deleted.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) { removePlan(plan.id); toast.success('Test plan deleted') }
  }

  const handleDeleteMilestone = async (milestone) => {
    const ok = await confirm({
      title: 'Delete milestone?',
      message: `"${milestone.name}" will be removed.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) { removeMilestone(milestone.id); toast.success('Milestone deleted') }
  }

  const togglePlanStatus = (plan) => {
    const newStatus = plan.status === 'Completed' ? 'Open' : 'Completed'
    const now = new Date().toISOString()
    updatePlan({
      ...plan,
      status: newStatus,
      completedAt: newStatus === 'Completed' ? now : '',
    })
    toast.success(newStatus === 'Completed' ? 'Plan marked complete' : 'Plan reopened')
  }

  const toggleMilestoneStatus = (milestone) => {
    const newStatus = milestone.status === 'Completed' ? 'Open' : 'Completed'
    const now = new Date().toISOString()
    updateMilestone({
      ...milestone,
      status: newStatus,
      completedAt: newStatus === 'Completed' ? now : '',
    })
    toast.success(newStatus === 'Completed' ? 'Milestone marked complete' : 'Milestone reopened')
  }

  if (selectedPlanId) {
    const planObj = plans.find(p => p.id === selectedPlanId)
    if (!planObj) {
      setSelectedPlanId(null)
      return null
    }
    const metrics = getPlanMetrics(planObj, runs, requirements, testCases, bugs)
    const linkedBugIds = new Set()
    metrics.linkedRuns.forEach((run) => { (run.cases || []).forEach((rc) => { if (rc.bugId) linkedBugIds.add(rc.bugId) }) })
    const planBugs = bugs.filter((b) => linkedBugIds.has(b.id))
    const planReqs = requirements.filter((r) => (planObj.requirementIds || []).includes(r.id))
    const scopeCases = getPlanTestCases(planObj, requirements, testCases)

    return (
      <div className="page-entrance">
        <PageHeader
          title={`Test Plan: ${planObj.name}`}
          description="Test plan execution progress, associated runs, and logged bugs."
          action={
            <div className="page-actions-row">
              <button className="secondary-button" type="button" onClick={() => setSelectedPlanId(null)}>Back to list</button>
              <button className="secondary-button" type="button" onClick={() => openEditPlan(planObj)}>Edit plan</button>
              {scopeCases.length > 0 && (
                <Link
                  to={`/projects/${projectId}/test-runs?planId=${planObj.id}`}
                  className="primary-button start-run-btn"
                  style={{ textDecoration: 'none' }}
                >
                  <span>Start a run ({scopeCases.length} cases)</span>
                  <span className="btn-icon-circle">▶</span>
                </Link>
              )}
            </div>
          }
        />

        <div className="double-bezel-outer">
          <section className="panel req-detail-page double-bezel-inner" style={{ marginBottom: 0 }}>
          <div className="req-detail-header">
            <div>
              <span className="mono tc-id">TEST PLAN</span>
              <h2>{planObj.name}</h2>
              {planObj.description && <p className="req-detail-desc">{planObj.description}</p>}
            </div>
            <StatusPill tone={planObj.status === 'Completed' ? 'passed' : 'pending'}>{planObj.status || 'Open'}</StatusPill>
          </div>

          <div className="req-detail-meta">
            <div><span>Scope</span><strong>{metrics.scopeTotal} cases</strong></div>
            <div><span>Executed</span><strong>{metrics.scopeExecuted}</strong></div>
            <div><span>Passed</span><strong style={{ color: '#1a6b37' }}>{metrics.scopePassed}</strong></div>
            <div><span>Failed</span><strong style={{ color: '#a93030' }}>{metrics.scopeFailed}</strong></div>
            <div><span>Blocked</span><strong style={{ color: '#7f1d1d' }}>{metrics.scopeBlocked}</strong></div>
            <div><span>Runs</span><strong>{metrics.totalRuns}</strong></div>
            <div><span>Pass rate</span><strong>{metrics.passRate}%</strong></div>
            {metrics.bugCount > 0 && <div><span>Bugs logged</span><strong>{metrics.bugCount}</strong></div>}
          </div>

          <div className="req-progress-cell req-detail-progress">
            <div className="req-progress-track">
              <span className="req-progress-fill" style={{ width: `${metrics.progressPct}%` }} />
            </div>
            <span className="req-progress-pct">{metrics.progressPct}% Scope Coverage</span>
          </div>

          <div className="section-header req-detail-section-head">
            <h2>Scope: Linked requirements</h2>
            <StatusPill tone="neutral">{planReqs.length}</StatusPill>
          </div>

          {planReqs.length === 0 ? (
            <div className="req-detail-empty">
              <p>No requirements are linked to this plan yet. Edit the plan to define its scope.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Title</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {planReqs.map((req) => (
                    <tr key={req.id}>
                      <td className="mono tc-id">{req.key || '—'}</td>
                      <td>
                        <Link className="text-link" to={`/projects/${projectId}/requirements/${req.id}`}>
                          {req.title}
                        </Link>
                      </td>
                      <td>{req.priority || 'Medium'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-header req-detail-section-head" style={{ marginTop: 24 }}>
            <h2>Test cases in scope</h2>
            <StatusPill tone="neutral">{scopeCases.length}</StatusPill>
          </div>

          {scopeCases.length === 0 ? (
            <div className="req-detail-empty">
              <p>No test cases in scope. Link requirements with test cases to define this plan's scope.</p>
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
                  {scopeCases.map((tc) => (
                    <tr key={tc.id}>
                      <td className="mono tc-id">{tc.sourceTcId || tc.id.slice(0, 8).toUpperCase()}</td>
                      <td><Link className="text-link" to={`/projects/${projectId}/test-cases/${tc.id}`}>{tc.title}</Link></td>
                      <td>{tc.module || '—'}</td>
                      <td>{tc.priority || '—'}</td>
                      <td>
                        <StatusPill tone={STATUS_TONE[tc.status] ?? 'pending'}>{normalizeTestStatus(tc.status)}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-header req-detail-section-head" style={{ marginTop: 24 }}>
            <h2>Associated test runs</h2>
            <StatusPill tone="neutral">{metrics.totalRuns}</StatusPill>
          </div>

          {metrics.linkedRuns.length === 0 ? (
            <div className="req-detail-empty">
              <p>No test runs are linked to this plan yet. Start a run from this plan to begin testing.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Name</th>
                    <th>Build</th>
                    <th>Pass Rate</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.linkedRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="mono tc-id">{run.id.slice(0, 8).toUpperCase()}</td>
                      <td>
                        <Link className="text-link" to={`/projects/${projectId}/test-runs/${run.id}`}>
                          {run.name || 'Untitled run'}
                        </Link>
                      </td>
                      <td>{run.build || '—'}</td>
                      <td>{run.passRate ?? 0}%</td>
                      <td>
                        <StatusPill tone={run.completedAt ? 'passed' : 'pending'}>
                          {run.completedAt ? 'Completed' : 'In progress'}
                        </StatusPill>
                      </td>
                      <td>{new Date(run.completedAt || run.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-header req-detail-section-head" style={{ marginTop: 24 }}>
            <h2>Logged bugs</h2>
            <StatusPill tone="neutral">{planBugs.length}</StatusPill>
          </div>

          {planBugs.length === 0 ? (
            <div className="req-detail-empty">
              <p>No bugs have been logged in the runs associated with this plan.</p>
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
                  {planBugs.map((bug) => (
                    <tr key={bug.id}>
                      <td className="mono tc-id">{bug.sourceBugId || bug.id.slice(0, 8).toUpperCase()}</td>
                      <td>
                        <Link className="text-link" to={`/projects/${projectId}/bugs`}>
                          {bug.title}
                        </Link>
                      </td>
                      <td>{bug.severity || '—'}</td>
                      <td>
                        <StatusPill tone={bug.status === 'Closed' ? 'passed' : 'failed'}>
                          {bug.status}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

        {showPlanForm && (
          <Modal title={editingPlan ? 'Edit test plan' : 'New test plan'} onClose={() => setShowPlanForm(false)} style={{ maxWidth: 560 }}>
            <form className="modal-form" onSubmit={submitPlan}>
              <label>
                Name <span className="required">*</span>
                <input autoFocus value={planForm.name} onChange={setPlan('name')} placeholder="v1.2 Regression" />
              </label>
              <label>
                Description
                <textarea rows={2} value={planForm.description} onChange={setPlan('description')} placeholder="Full regression for release 1.2" />
              </label>
              <div className="form-row">
                <label>
                  Status
                  <select value={planForm.status} onChange={setPlan('status')}>
                    {PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                {milestones.length > 0 && (
                  <label>
                    Milestone
                    <select value={planForm.milestoneId} onChange={setPlan('milestoneId')}>
                      <option value="">None</option>
                      {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div>
                <label>Linked requirements <span className="hint">({(planForm.requirementIds || []).length} selected)</span></label>
                <div className="req-tc-picker" style={{ maxHeight: 200 }}>
                  {requirements.length === 0 ? (
                    <p className="panel-empty-text">No requirements yet. Create a requirement first.</p>
                  ) : (
                    requirements.map((req) => (
                      <label key={req.id} className="req-tc-option">
                        <input
                          className="row-checkbox"
                          type="checkbox"
                          checked={(planForm.requirementIds || []).includes(req.id)}
                          onChange={() => togglePlanRequirement(req.id)}
                        />
                        <span className="req-tc-title">{req.key ? `${req.key}: ` : ''}{req.title}</span>
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          {req.priority || 'Medium'}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={() => setShowPlanForm(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={!planForm.name.trim()}>
                  {editingPlan ? 'Save' : 'Create plan'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    )
  }

  if (selectedMilestoneId) {
    const milestoneObj = milestones.find(m => m.id === selectedMilestoneId)
    if (!milestoneObj) {
      setSelectedMilestoneId(null)
      return null
    }
    const metrics = getMilestoneMetrics(milestoneObj, plans, runs, requirements, testCases, bugs)

    return (
      <div className="page-entrance">
        <PageHeader
          title={`Milestone: ${milestoneObj.name}`}
          description="Milestone status, linked test plans, and release readiness tracker."
          action={
            <div className="page-actions-row">
              <button className="secondary-button" type="button" onClick={() => setSelectedMilestoneId(null)}>Back to list</button>
              <button className="primary-button" type="button" onClick={() => openEditMilestone(milestoneObj)}>Edit milestone</button>
            </div>
          }
        />

        <div className="double-bezel-outer">
          <section className="panel req-detail-page double-bezel-inner" style={{ marginBottom: 0 }}>
          <div className="req-detail-header">
            <div>
              <span className="mono tc-id">MILESTONE</span>
              <h2>{milestoneObj.name}</h2>
              {milestoneObj.description && <p className="req-detail-desc">{milestoneObj.description}</p>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <StatusPill tone={metrics.onTrack ? 'passed' : 'failed'}>{metrics.onTrack ? 'On track' : 'At risk'}</StatusPill>
              <StatusPill tone={milestoneObj.status === 'Completed' ? 'passed' : 'pending'}>{milestoneObj.status || 'Open'}</StatusPill>
            </div>
          </div>

          <div className="req-detail-meta">
            <div>
              <span>Due date</span>
              <strong>
                {milestoneObj.dueDate ? new Date(milestoneObj.dueDate).toLocaleDateString() : '—'}
                {metrics.overdue && <span className="text-danger" style={{ marginLeft: 6, fontSize: 12 }}>(Overdue)</span>}
              </strong>
            </div>
            <div><span>Linked plans</span><strong>{metrics.totalPlans}</strong></div>
            <div><span>Total runs</span><strong>{metrics.totalRuns}</strong></div>
            <div><span>Total cases</span><strong>{metrics.totalCases}</strong></div>
            <div><span>Passed</span><strong style={{ color: '#1a6b37' }}>{metrics.scopePassed}</strong></div>
            <div><span>Failed</span><strong style={{ color: '#a93030' }}>{metrics.scopeFailed}</strong></div>
            <div><span>Blocked</span><strong style={{ color: '#7f1d1d' }}>{metrics.scopeBlocked}</strong></div>
            <div><span>Pass rate</span><strong>{metrics.passRate}%</strong></div>
            {metrics.bugCount > 0 && <div><span>Bugs logged</span><strong>{metrics.bugCount}</strong></div>}
          </div>

          <div className="req-progress-cell req-detail-progress">
            <div className="req-progress-track">
              <span className="req-progress-fill" style={{ width: `${metrics.progressPct}%` }} />
            </div>
            <span className="req-progress-pct">{metrics.progressPct}% Scope Coverage</span>
          </div>

          <div className="section-header req-detail-section-head">
            <h2>Linked test plans</h2>
            <StatusPill tone="neutral">{metrics.totalPlans}</StatusPill>
          </div>

          {metrics.linkedPlans.length === 0 ? (
            <div className="req-detail-empty">
              <p>No test plans are linked to this milestone yet. Edit the milestone to associate plans.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="rpt-table">
                <thead>
                  <tr>
                    <th>Plan ID</th>
                    <th>Name</th>
                    <th>Runs</th>
                    <th>Pass Rate</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.linkedPlans.map((plan) => {
                    const planMetrics = getPlanMetrics(plan, runs, requirements, testCases)
                    return (
                      <tr key={plan.id}>
                        <td className="mono tc-id">{plan.id.slice(0, 8).toUpperCase()}</td>
                        <td>
                          <button className="link-btn" type="button" onClick={() => { setSelectedPlanId(plan.id); setSelectedMilestoneId(null); }}>
                            {plan.name}
                          </button>
                        </td>
                        <td>{planMetrics.totalRuns}</td>
                        <td>{planMetrics.passRate}%</td>
                        <td>
                          <div className="req-progress-cell">
                            <div className="req-progress-track">
                              <span className="req-progress-fill" style={{ width: `${planMetrics.progressPct}%` }} />
                            </div>
                            <span className="req-progress-pct">{planMetrics.progressPct}%</span>
                          </div>
                        </td>
                        <td>
                          <StatusPill tone={plan.status === 'Completed' ? 'passed' : 'pending'}>
                            {plan.status || 'Open'}
                          </StatusPill>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

        {showMilestoneForm && (
          <Modal title={editingMilestone ? 'Edit milestone' : 'New milestone'} onClose={() => setShowMilestoneForm(false)} style={{ maxWidth: 560 }}>
            <form className="modal-form" onSubmit={submitMilestone}>
              <label>
                Name <span className="required">*</span>
                <input autoFocus value={milestoneForm.name} onChange={setMilestone('name')} placeholder="Release 1.2" />
              </label>
              <label>
                Description
                <textarea rows={2} value={milestoneForm.description} onChange={setMilestone('description')} />
              </label>
              <div className="form-row">
                <label>
                  Due date
                  <input type="date" value={milestoneForm.dueDate} onChange={setMilestone('dueDate')} />
                </label>
                <label>
                  Status
                  <select value={milestoneForm.status} onChange={setMilestone('status')}>
                    {MILESTONE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              {editingMilestone && (
                <div>
                  <label>Linked test plans <span className="hint">({milestoneForm.testPlanIds.length} selected)</span></label>
                  <div className="req-tc-picker" style={{ maxHeight: 200 }}>
                    {plans.length === 0 ? (
                      <p className="panel-empty-text">No test plans yet.</p>
                    ) : (
                      plans.map((plan) => (
                        <label key={plan.id} className="req-tc-option">
                          <input
                            className="row-checkbox"
                            type="checkbox"
                            checked={milestoneForm.testPlanIds.includes(plan.id)}
                            onChange={() => toggleMilestonePlan(plan.id)}
                          />
                          <span className="req-tc-title">{plan.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={() => setShowMilestoneForm(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={!milestoneForm.name.trim()}>
                  {editingMilestone ? 'Save' : 'Create milestone'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        backTo={`/projects`}
        title="Test plans & milestones"
        description="Group test runs by release or sprint and track progress against deadlines."
        action={
          tab === 'plans'
            ? <button className="primary-button" type="button" onClick={openAddPlan}>+ Add test plan</button>
            : <button className="primary-button" type="button" onClick={openAddMilestone}>+ Add milestone</button>
        }
      />

      {/* Summary Metrics Strip */}
      <div className="tp-summary-strip">
        <div className="tp-summary-card">
          <span className="tp-summary-label">Plans</span>
          <strong className="tp-summary-value">{plans.length}</strong>
          <span className="tp-summary-sub">
            {summaryStats.activePlans} active · {summaryStats.completedPlans} done
          </span>
        </div>
        <div className="tp-summary-divider" />
        <div className="tp-summary-card">
          <span className="tp-summary-label">Milestones</span>
          <strong className="tp-summary-value">{milestones.length}</strong>
          <span className="tp-summary-sub">
            {summaryStats.activeMilestones} active · {summaryStats.completedMilestones} done
          </span>
        </div>
        <div className="tp-summary-divider" />
        <div className="tp-summary-card">
          <span className="tp-summary-label">Total cases</span>
          <strong className="tp-summary-value">{summaryStats.totalCases}</strong>
          <span className="tp-summary-sub">
            {summaryStats.totalPassed} passed
          </span>
        </div>
        <div className="tp-summary-divider" />
        <div className="tp-summary-card">
          <span className="tp-summary-label">Pass rate</span>
          <strong className="tp-summary-value tp-summary-value--rate">{summaryStats.overallPassRate}%</strong>
          <span className="tp-summary-sub">across all plans</span>
        </div>
      </div>

      <div className="tab-navigation" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'milestones'}
          className={`tab-btn${tab === 'milestones' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('milestones')}
        >
          <span>Milestones</span>
          <span className="tab-count-badge">{milestones.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plans'}
          className={`tab-btn${tab === 'plans' ? ' tab-btn--active' : ''}`}
          onClick={() => setTab('plans')}
        >
          <span>Test plans</span>
          <span className="tab-count-badge">{plans.length}</span>
        </button>
      </div>

      {tab === 'plans' && (
        <section className="panel">
          <div className="section-header">
            <h2>Test plans</h2>
            {plans.length > 0 && <StatusPill tone="neutral">{plans.length}</StatusPill>}
          </div>
          {plans.length === 0 ? (
            <div className="req-empty-state">
              <h3>No test plans yet</h3>
              <p>Create a plan to group related test runs (e.g. v1.2 regression, Sprint 14 smoke).</p>
              <button className="primary-button" type="button" onClick={openAddPlan}>+ Add test plan</button>
            </div>
          ) : (
            <>
              {/* Filter toolbar */}
              <div className="toolbar">
                <input
                  type="search"
                  className="toolbar-search"
                  placeholder="Search plans…"
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  aria-label="Search plans"
                />
                <select
                  value={planStatusFilter}
                  onChange={(e) => setPlanStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className={planStatusFilter ? 'filter-active' : ''}
                >
                  <option value="">All status</option>
                  <option value="Open">Open</option>
                  <option value="Completed">Completed</option>
                </select>
                {(planSearch || planStatusFilter) && (
                  <button
                    className="filter-clear-btn"
                    type="button"
                    onClick={() => { setPlanSearch(''); setPlanStatusFilter('') }}
                  >
                    Clear filters
                  </button>
                )}
                <span className="toolbar-info">
                  {planRows.length} of {plans.length} plan{plans.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Desktop table */}
              <div className="table-wrap tp-table-wrap">
                <table className="tp-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Progress</th>
                      <th>Pass rate</th>
                      <th>Health</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {planRows.map(({ plan, metrics }) => (
                      <tr key={plan.id} className={`tp-row tp-row--${plan.status === 'Completed' ? 'completed' : 'active'}`}>
                        <td>
                          <div className="tp-row-name">
                            <button className="link-btn tp-row-title" type="button" onClick={() => setSelectedPlanId(plan.id)}>
                              {plan.name}
                            </button>
                            {plan.description && <p className="tp-row-desc">{plan.description}</p>}
                            <div className="tp-row-tags">
                              {metrics.scopeTotal > 0 && <span className="tp-tag">{metrics.scopeTotal} cases</span>}
                              {metrics.totalRuns > 0 && <span className="tp-tag">{metrics.totalRuns} run{metrics.totalRuns !== 1 ? 's' : ''}</span>}
                              {metrics.bugCount > 0 && <span className="tp-tag tp-tag--danger">{metrics.bugCount} bug{metrics.bugCount !== 1 ? 's' : ''}</span>}
                              {plan.completedAt && (
                                <span className="tp-tag tp-tag--neutral">
                                  Done {new Date(plan.completedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {(metrics.scopePassed > 0 || metrics.scopeFailed > 0 || metrics.scopeBlocked > 0) && (
                              <div className="tp-row-breakdown">
                                {metrics.scopePassed > 0 && <span className="tp-bd tp-bd--pass">{metrics.scopePassed} passed</span>}
                                {metrics.scopeFailed > 0 && <span className="tp-bd tp-bd--fail">{metrics.scopeFailed} failed</span>}
                                {metrics.scopeBlocked > 0 && <span className="tp-bd tp-bd--block">{metrics.scopeBlocked} blocked</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <SegBar
                            total={metrics.scopeTotal}
                            passed={metrics.scopePassed}
                            failed={metrics.scopeFailed}
                            blocked={metrics.scopeBlocked}
                            pct={metrics.progressPct}
                          />
                        </td>
                        <td><span className="tp-rate-num">{metrics.passRate}%</span></td>
                        <td>
                          {metrics.scopeExecuted > 0 ? (
                            <StatusPill tone={metrics.passRate >= 80 ? 'passed' : metrics.passRate >= 50 ? 'pending' : 'failed'}>
                              {metrics.passRate >= 80 ? 'Healthy' : metrics.passRate >= 50 ? 'At risk' : 'Critical'}
                            </StatusPill>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <button
                            className={`tp-status-toggle ${plan.status === 'Completed' ? 'tp-status-toggle--done' : 'tp-status-toggle--open'}`}
                            type="button"
                            onClick={() => togglePlanStatus(plan)}
                            title={plan.status === 'Completed' ? 'Reopen plan' : 'Mark complete'}
                            aria-label={plan.status === 'Completed' ? 'Reopen plan' : 'Mark complete'}
                          >
                            <CheckIcon width={12} height={12} />
                            <span>{plan.status === 'Completed' ? 'Done' : 'Open'}</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-row-actions">
                            {metrics.scopeTotal > 0 && plan.status !== 'Completed' && (
                              <Link
                                to={`/projects/${projectId}/test-runs?planId=${plan.id}`}
                                className="icon-btn-action icon-btn-action--run"
                                title="Start a run"
                                aria-label="Start a run"
                                style={{ textDecoration: 'none' }}
                              >
                                <PlayIcon width={14} height={14} />
                              </Link>
                            )}
                            <button className="icon-btn-action" type="button" title="Edit" aria-label="Edit" onClick={() => openEditPlan(plan)}>
                              <PencilIcon width={14} height={14} />
                            </button>
                            <button className="icon-btn-action text-danger" type="button" title="Delete" aria-label="Delete" onClick={() => handleDeletePlan(plan)}>
                              <XIcon width={14} height={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="tp-card-list">
                {planRows.map(({ plan, metrics }) => (
                  <div className="tp-card" key={plan.id}>
                    <div className="tp-card-header">
                      <div>
                        <button className="tp-card-name link-btn" type="button" style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, font: 'inherit' }} onClick={() => setSelectedPlanId(plan.id)}>{plan.name}</button>
                        {plan.description && <p className="tp-card-desc">{plan.description}</p>}
                        {plan.completedAt && (
                          <span className="tp-tag tp-tag--neutral" style={{ marginTop: 4, display: 'inline-block' }}>
                            Done {new Date(plan.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <button
                        className={`tp-status-toggle ${plan.status === 'Completed' ? 'tp-status-toggle--done' : 'tp-status-toggle--open'}`}
                        type="button"
                        onClick={() => togglePlanStatus(plan)}
                        title={plan.status === 'Completed' ? 'Reopen plan' : 'Mark complete'}
                        aria-label={plan.status === 'Completed' ? 'Reopen plan' : 'Mark complete'}
                      >
                        <CheckIcon width={12} height={12} />
                        <span>{plan.status === 'Completed' ? 'Done' : 'Open'}</span>
                      </button>
                    </div>
                    <div className="tp-card-meta">
                      <div className="tp-card-meta-item">
                        <span className="tp-card-meta-label">Runs</span>
                        <span>{metrics.totalRuns}</span>
                      </div>
                      <div className="tp-card-meta-item">
                        <span className="tp-card-meta-label">Pass rate</span>
                        <span>{metrics.passRate}%</span>
                      </div>
                      {metrics.scopeFailed > 0 && (
                        <div className="tp-card-meta-item">
                          <span className="tp-card-meta-label">Failed</span>
                          <span style={{ color: '#a93030', fontWeight: 700 }}>{metrics.scopeFailed}</span>
                        </div>
                      )}
                      {metrics.scopeBlocked > 0 && (
                        <div className="tp-card-meta-item">
                          <span className="tp-card-meta-label">Blocked</span>
                          <span style={{ color: '#7f1d1d', fontWeight: 700 }}>{metrics.scopeBlocked}</span>
                        </div>
                      )}
                    </div>
                    <div className="tp-card-progress">
                      <SegBar
                        total={metrics.scopeTotal}
                        passed={metrics.scopePassed}
                        failed={metrics.scopeFailed}
                        blocked={metrics.scopeBlocked}
                        pct={metrics.progressPct}
                      />
                    </div>
                    <div className="tp-card-actions">
                      {metrics.scopeTotal > 0 && plan.status !== 'Completed' && (
                        <Link
                          to={`/projects/${projectId}/test-runs?planId=${plan.id}`}
                          className="secondary-button start-run-btn"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <PlayIcon width={12} height={12} />
                          <span>Run</span>
                        </Link>
                      )}
                      <button className="secondary-button" type="button" onClick={() => openEditPlan(plan)}>
                        <PencilIcon width={14} height={14} /> Edit
                      </button>
                      <button className="secondary-button text-danger" type="button" onClick={() => handleDeletePlan(plan)}>
                        <XIcon width={14} height={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'milestones' && (
        <section className="panel">
          <div className="section-header">
            <h2>Milestones</h2>
            {milestones.length > 0 && <StatusPill tone="neutral">{milestones.length}</StatusPill>}
          </div>
          {milestones.length === 0 ? (
            <div className="req-empty-state">
              <h3>No milestones yet</h3>
              <p>Set release deadlines and link test plans to track if you are on track.</p>
              <button className="primary-button" type="button" onClick={openAddMilestone}>+ Add milestone</button>
            </div>
          ) : (
            <>
              {/* Filter toolbar */}
              <div className="toolbar">
                <input
                  type="search"
                  className="toolbar-search"
                  placeholder="Search milestones…"
                  value={milestoneSearch}
                  onChange={(e) => setMilestoneSearch(e.target.value)}
                  aria-label="Search milestones"
                />
                <select
                  value={milestoneStatusFilter}
                  onChange={(e) => setMilestoneStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className={milestoneStatusFilter ? 'filter-active' : ''}
                >
                  <option value="">All status</option>
                  <option value="Open">Open</option>
                  <option value="Completed">Completed</option>
                </select>
                {(milestoneSearch || milestoneStatusFilter) && (
                  <button
                    className="filter-clear-btn"
                    type="button"
                    onClick={() => { setMilestoneSearch(''); setMilestoneStatusFilter('') }}
                  >
                    Clear filters
                  </button>
                )}
                <span className="toolbar-info">
                  {milestoneRows.length} of {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Desktop table */}
              <div className="table-wrap ms-table-wrap">
                <table className="ms-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Progress</th>
                      <th>Pass rate</th>
                      <th>On track</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestoneRows.map(({ milestone, metrics }) => {
                      const dueDateStr = milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : null
                      const urgencyTone = metrics.overdue ? 'failed' : metrics.daysLeft !== null && metrics.daysLeft <= 3 ? 'pending' : 'neutral'
                      return (
                      <tr key={milestone.id} className={`tp-row tp-row--${milestone.status === 'Completed' ? 'completed' : 'active'}`}>
                        <td>
                          <div className="tp-row-name">
                            <button className="link-btn tp-row-title" type="button" onClick={() => setSelectedMilestoneId(milestone.id)}>
                              {milestone.name}
                            </button>
                            {milestone.description && <p className="tp-row-desc">{milestone.description}</p>}
                            <div className="tp-row-tags">
                              {dueDateStr && <span className="tp-tag">Due {dueDateStr}</span>}
                              {metrics.totalPlans > 0 && <span className="tp-tag">{metrics.totalPlans} plan{metrics.totalPlans !== 1 ? 's' : ''}</span>}
                              {metrics.bugCount > 0 && <span className="tp-tag tp-tag--danger">{metrics.bugCount} bug{metrics.bugCount !== 1 ? 's' : ''}</span>}
                              {metrics.overdue && <span className="tp-tag tp-tag--danger">Overdue</span>}
                              {!metrics.overdue && metrics.daysLeft !== null && metrics.daysLeft >= 0 && (
                                <span className={`tp-tag tp-tag--${urgencyTone}`}>{metrics.daysLeft}d left</span>
                              )}
                              {milestone.completedAt && (
                                <span className="tp-tag tp-tag--neutral">
                                  Done {new Date(milestone.completedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {(metrics.scopePassed > 0 || metrics.scopeFailed > 0 || metrics.scopeBlocked > 0) && (
                              <div className="tp-row-breakdown">
                                {metrics.scopePassed > 0 && <span className="tp-bd tp-bd--pass">{metrics.scopePassed} passed</span>}
                                {metrics.scopeFailed > 0 && <span className="tp-bd tp-bd--fail">{metrics.scopeFailed} failed</span>}
                                {metrics.scopeBlocked > 0 && <span className="tp-bd tp-bd--block">{metrics.scopeBlocked} blocked</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <SegBar
                            total={metrics.scopeTotal}
                            passed={metrics.scopePassed}
                            failed={metrics.scopeFailed}
                            blocked={metrics.scopeBlocked}
                            pct={metrics.progressPct}
                          />
                        </td>
                        <td><span className="tp-rate-num">{metrics.passRate}%</span></td>
                        <td>
                          <StatusPill tone={metrics.onTrack ? 'passed' : 'failed'}>
                            {metrics.onTrack ? 'On track' : 'At risk'}
                          </StatusPill>
                        </td>
                        <td>
                          <button
                            className={`tp-status-toggle ${milestone.status === 'Completed' ? 'tp-status-toggle--done' : 'tp-status-toggle--open'}`}
                            type="button"
                            onClick={() => toggleMilestoneStatus(milestone)}
                            title={milestone.status === 'Completed' ? 'Reopen milestone' : 'Mark complete'}
                            aria-label={milestone.status === 'Completed' ? 'Reopen milestone' : 'Mark complete'}
                          >
                            <CheckIcon width={12} height={12} />
                            <span>{milestone.status === 'Completed' ? 'Done' : 'Open'}</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-row-actions">
                            <button className="icon-btn-action" type="button" title="Edit" aria-label="Edit" onClick={() => openEditMilestone(milestone)}>
                              <PencilIcon width={14} height={14} />
                            </button>
                            <button className="icon-btn-action text-danger" type="button" title="Delete" aria-label="Delete" onClick={() => handleDeleteMilestone(milestone)}>
                              <XIcon width={14} height={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="tp-card-list">
                {milestoneRows.map(({ milestone, metrics }) => (
                  <div className="tp-card" key={milestone.id}>
                    <div className="tp-card-header">
                      <div>
                        <button className="tp-card-name link-btn" type="button" style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, font: 'inherit' }} onClick={() => setSelectedMilestoneId(milestone.id)}>{milestone.name}</button>
                        {milestone.description && <p className="tp-card-desc">{milestone.description}</p>}
                        {milestone.completedAt && (
                          <span className="tp-tag tp-tag--neutral" style={{ marginTop: 4, display: 'inline-block' }}>
                            Done {new Date(milestone.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <StatusPill tone={metrics.onTrack ? 'passed' : 'failed'}>
                          {metrics.onTrack ? 'On track' : 'At risk'}
                        </StatusPill>
                        <button
                          className={`tp-status-toggle tp-status-toggle--sm ${milestone.status === 'Completed' ? 'tp-status-toggle--done' : 'tp-status-toggle--open'}`}
                          type="button"
                          onClick={() => toggleMilestoneStatus(milestone)}
                          aria-label={milestone.status === 'Completed' ? 'Reopen milestone' : 'Mark complete'}
                        >
                          <CheckIcon width={10} height={10} />
                          <span>{milestone.status === 'Completed' ? 'Done' : 'Open'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="tp-card-meta">
                      <div className="tp-card-meta-item">
                        <span className="tp-card-meta-label">Due</span>
                        <span>{milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : '—'}</span>
                      </div>
                      <div className="tp-card-meta-item">
                        <span className="tp-card-meta-label">Plans</span>
                        <span>{metrics.totalPlans}</span>
                      </div>
                      <div className="tp-card-meta-item">
                        <span className="tp-card-meta-label">Pass rate</span>
                        <span>{metrics.passRate}%</span>
                      </div>
                      {metrics.scopeFailed > 0 && (
                        <div className="tp-card-meta-item">
                          <span className="tp-card-meta-label">Failed</span>
                          <span style={{ color: '#a93030', fontWeight: 700 }}>{metrics.scopeFailed}</span>
                        </div>
                      )}
                      {metrics.overdue && (
                        <StatusPill tone="failed" style={{ fontSize: 10, minHeight: 20 }}>Overdue</StatusPill>
                      )}
                    </div>
                    <div className="tp-card-progress">
                      <SegBar
                        total={metrics.scopeTotal}
                        passed={metrics.scopePassed}
                        failed={metrics.scopeFailed}
                        blocked={metrics.scopeBlocked}
                        pct={metrics.progressPct}
                      />
                    </div>
                    <div className="tp-card-actions">
                      <button className="secondary-button" type="button" onClick={() => openEditMilestone(milestone)}>
                        <PencilIcon width={14} height={14} /> Edit
                      </button>
                      <button className="secondary-button text-danger" type="button" onClick={() => handleDeleteMilestone(milestone)}>
                        <XIcon width={14} height={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {showPlanForm && (
        <Modal title={editingPlan ? 'Edit test plan' : 'New test plan'} onClose={() => setShowPlanForm(false)} style={{ maxWidth: 560 }}>
          <form className="modal-form" onSubmit={submitPlan}>
            <label>
              Name <span className="required">*</span>
              <input autoFocus value={planForm.name} onChange={setPlan('name')} placeholder="v1.2 Regression" />
            </label>
            <label>
              Description
              <textarea rows={2} value={planForm.description} onChange={setPlan('description')} placeholder="Full regression for release 1.2" />
            </label>
            <div className="form-row">
              <label>
                Status
                <select value={planForm.status} onChange={setPlan('status')}>
                  {PLAN_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              {milestones.length > 0 && (
                <label>
                  Milestone
                  <select value={planForm.milestoneId} onChange={setPlan('milestoneId')}>
                    <option value="">None</option>
                    {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div>
              <label>Linked requirements <span className="hint">({(planForm.requirementIds || []).length} selected)</span></label>
              <div className="req-tc-picker" style={{ maxHeight: 200 }}>
                {requirements.length === 0 ? (
                  <p className="panel-empty-text">No requirements yet. Create a requirement first.</p>
                ) : (
                  requirements.map((req) => (
                    <label key={req.id} className="req-tc-option">
                      <input
                        className="row-checkbox"
                        type="checkbox"
                        checked={(planForm.requirementIds || []).includes(req.id)}
                        onChange={() => togglePlanRequirement(req.id)}
                      />
                      <span className="req-tc-title">{req.key ? `${req.key}: ` : ''}{req.title}</span>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {req.priority || 'Medium'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowPlanForm(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={!planForm.name.trim()}>
                {editingPlan ? 'Save' : 'Create plan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showMilestoneForm && (
        <Modal title={editingMilestone ? 'Edit milestone' : 'New milestone'} onClose={() => setShowMilestoneForm(false)} style={{ maxWidth: 560 }}>
          <form className="modal-form" onSubmit={submitMilestone}>
            <label>
              Name <span className="required">*</span>
              <input autoFocus value={milestoneForm.name} onChange={setMilestone('name')} placeholder="Release 1.2" />
            </label>
            <label>
              Description
              <textarea rows={2} value={milestoneForm.description} onChange={setMilestone('description')} />
            </label>
            <div className="form-row">
              <label>
                Due date
                <input type="date" value={milestoneForm.dueDate} onChange={setMilestone('dueDate')} />
              </label>
              <label>
                Status
                <select value={milestoneForm.status} onChange={setMilestone('status')}>
                  {MILESTONE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {editingMilestone && (
              <div>
                <label>Linked test plans <span className="hint">({milestoneForm.testPlanIds.length} selected)</span></label>
                <div className="req-tc-picker" style={{ maxHeight: 200 }}>
                  {plans.length === 0 ? (
                    <p className="panel-empty-text">No test plans yet.</p>
                  ) : (
                    plans.map((plan) => (
                      <label key={plan.id} className="req-tc-option">
                        <input
                          className="row-checkbox"
                          type="checkbox"
                          checked={milestoneForm.testPlanIds.includes(plan.id)}
                          onChange={() => toggleMilestonePlan(plan.id)}
                        />
                        <span className="req-tc-title">{plan.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setShowMilestoneForm(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={!milestoneForm.name.trim()}>
                {editingMilestone ? 'Save' : 'Create milestone'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
