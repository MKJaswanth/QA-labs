import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { useConfirm } from '../context/useConfirm'
import { useToast } from '../context/useToast'
import { useProjects } from '../hooks/useProjects'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { getBugs, getTestCases, getTestRuns } from '../utils/storage'
import { useUserRole } from '../hooks/useUserRole'
import { isOpenBug } from '../utils/reportMetrics'
import { XIcon } from '../components/Icons'

function Avatar({ name }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="avatar" title={name} aria-label={name}>
      {initials}
    </span>
  )
}

const blank = { name: '', description: '', memberIds: [] }

export function ProjectsPage() {
  const { projects, addProject, removeProject } = useProjects()
  const { members } = useTeamMembers()
  const { isLead } = useUserRole()
  const confirm = useConfirm()
  const toast = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)

  const enriched = useMemo(() => projects.map((project) => {
    const cases = getTestCases(project.id)
    const bugs = getBugs(project.id)
    const runs = getTestRuns(project.id)
    const passed = cases.filter(tc => tc.status === 'Pass').length
    const passRate = cases.length > 0 ? Math.round((passed / cases.length) * 100) : 0
    const openBugs = bugs.filter(isOpenBug).length
    const inProgressRuns = runs.filter(r => !r.completedAt).length
    const lastRun = runs
      .filter(r => r.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
    const projectMembers = members.filter((m) => project.memberIds?.includes(m.id))
    const healthTone = cases.length === 0 ? 'neutral'
      : passRate >= 70 ? 'passed'
      : passRate >= 50 ? 'pending'
      : 'failed'
    const healthLabel = cases.length === 0 ? 'No data'
      : passRate >= 70 ? 'Healthy'
      : passRate >= 50 ? 'At risk'
      : 'Critical'
    return { ...project, totalCases: cases.length, openBugs, totalRuns: runs.length, inProgressRuns, passRate, lastRun, projectMembers, healthTone, healthLabel }
  }), [projects, members])

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((m) => m !== id) : [...f.memberIds, id],
    }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || saving) return
    setSaving(true)
    try {
      const { remoteSaved, remoteReady } = await addProject({
        name: form.name.trim(),
        description: form.description.trim(),
        memberIds: form.memberIds,
      })
      if (remoteReady && !remoteSaved) {
        toast.error('Project saved locally but Firebase sync failed. Check Firestore rules and try again.')
      } else if (!remoteReady) {
        toast.warning('Project saved locally only.')
      } else {
        toast.success('Project created.')
      }
      setForm(blank)
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Your QA workspaces. Each project tracks test cases, bugs, runs, and requirements independently."
        action={
          isLead && (
            <button className="primary-button" type="button" onClick={() => setShowAdd(true)}>
              + New project
            </button>
          )
        }
      />

      {projects.length === 0 ? (
        <section className="empty-state">
          <h2>No projects yet</h2>
          <p>Click "New project" to create your first QA workspace.</p>
        </section>
      ) : (
        <section className="proj-grid">
          {enriched.map((project) => (
            <article key={project.id} className="proj-card">

              {/* Header: initial + name + health */}
              <div className="proj-card-head">
                <div className="proj-card-initial">
                  {(project.name || '?')[0].toUpperCase()}
                </div>
                <div className="proj-card-head-text">
                  <h2 className="proj-card-name">{project.name}</h2>
                  {project.description && (
                    <p className="proj-card-desc">{project.description}</p>
                  )}
                </div>
                {project.totalCases > 0 && (
                  <StatusPill tone={project.healthTone} style={{ flexShrink: 0 }}>
                    {project.healthLabel}
                  </StatusPill>
                )}
              </div>

              {/* Stat row */}
              <div className="proj-card-stats">
                <div className="proj-card-stat">
                  <strong>{project.totalCases}</strong>
                  <span>cases</span>
                </div>
                <div className="proj-card-stat">
                  <strong className={project.openBugs > 0 ? 'proj-stat-danger' : ''}>
                    {project.openBugs}
                  </strong>
                  <span>open bugs</span>
                </div>
                <div className="proj-card-stat">
                  <strong>{project.totalRuns}</strong>
                  <span>runs</span>
                </div>
              </div>

              {/* Pass rate bar */}
              {project.totalCases > 0 && (
                <div className="proj-card-rate">
                  <div className="proj-card-rate-row">
                    <span className="proj-card-rate-label">Pass rate</span>
                    <span className="proj-card-rate-val">{project.passRate}%</span>
                  </div>
                  <div className="proj-card-bar-track">
                    <div
                      className="proj-card-bar-fill"
                      style={{ width: `${project.passRate}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="proj-card-footer">
                <div className="proj-card-footer-left">
                  {project.projectMembers.length > 0 && (
                    <div className="avatar-row">
                      {project.projectMembers.slice(0, 5).map(m => (
                        <Avatar key={m.id} name={m.name} />
                      ))}
                      {project.projectMembers.length > 5 && (
                        <span className="avatar proj-avatar-extra">
                          +{project.projectMembers.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                  {project.inProgressRuns > 0 && (
                    <span className="proj-card-live">
                      <span className="proj-card-live-dot" />
                      {project.inProgressRuns} run{project.inProgressRuns !== 1 ? 's' : ''} active
                    </span>
                  )}
                  {!project.inProgressRuns && project.lastRun && (
                    <span className="proj-card-last-run">
                      Last run {new Date(project.lastRun.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="proj-card-footer-right">
                  <Link
                    to={`/projects/${project.id}/dashboard`}
                    className="primary-button"
                    style={{ textDecoration: 'none', fontSize: 13, padding: '6px 14px' }}
                  >
                    Open →
                  </Link>
                  {isLead && (
                    <button
                      className="icon-btn-action text-danger"
                      type="button"
                      title="Delete project"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Delete project?',
                          message: `All data in "${project.name}" will be permanently deleted.`,
                          confirmLabel: 'Delete project',
                          danger: true,
                          requireText: project.name,
                        })
                        if (ok) removeProject(project.id)
                      }}
                    >
                      <XIcon width={14} height={14} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {showAdd && (
        <Modal title="New project" onClose={() => { setShowAdd(false); setForm(blank) }}>
          <form className="modal-form" onSubmit={handleAdd}>
            <label>
              Name <span className="required">*</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="E.g. Mobile app"
              />
            </label>
            <label>
              Description
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </label>
            {members.length > 0 && (
              <fieldset className="member-picker">
                <legend>Team members</legend>
                <div className="member-picker-list">
                  {members.map((m) => (
                    <label key={m.id} className="member-check">
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                      />
                      <Avatar name={m.name} />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => { setShowAdd(false); setForm(blank) }}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
