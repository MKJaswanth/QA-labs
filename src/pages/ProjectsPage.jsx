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

function Avatar({ name, size = 26 }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="avatar" title={name} aria-label={name} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  )
}

function ProjectInitial({ name }) {
  const letter = (name || '?')[0].toUpperCase()
  const hue = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div className="proj-card-initial" style={{ background: `hsl(${hue}, 55%, 50%)` }}>
      {letter}
    </div>
  )
}

function StatChip({ label, value, danger }) {
  return (
    <div className="proj-card-chip">
      <strong className={danger && value > 0 ? 'proj-chip-danger' : ''}>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function MiniBar({ pct, tone }) {
  const color = tone === 'good' ? '#22c55e' : tone === 'warn' ? '#f59e0b' : '#ef4444'
  return (
    <div className="proj-card-bar">
      <div className="proj-card-bar-track">
        <div className="proj-card-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
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
    const inProgressRuns = runs.filter(r => !r.completedAt)
    const lastRun = runs.filter(r => r.completedAt).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0]
    const projectMembers = members.filter((m) => project.memberIds?.includes(m.id))
    const tone = cases.length === 0 ? 'neutral' : passRate >= 70 ? 'good' : passRate >= 50 ? 'warn' : 'bad'
    return { ...project, cases: cases.length, openBugs, runs: runs.length, inProgressRuns: inProgressRuns.length, passRate, lastRun, projectMembers, tone }
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
        toast.error('Project saved in this browser, but Firebase sync failed. Check Firestore rules/network and try again.')
      } else if (!remoteReady) {
        toast.warning('Project saved locally only. Sign in with a real account and wait for cloud sync before creating shared projects.')
      } else {
        toast.success('Project created and synced to Firebase.')
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
            <article key={project.id} className={`proj-card proj-card--${project.tone}`}>

              {/* Card top: initial + health */}
              <div className="proj-card-top">
                <ProjectInitial name={project.name} />
                <div className="proj-card-top-right">
                  {project.cases > 0 && (
                    <StatusPill tone={project.passRate >= 70 ? 'passed' : project.passRate >= 50 ? 'pending' : 'failed'}>
                      {project.passRate >= 70 ? 'Healthy' : project.passRate >= 50 ? 'At risk' : 'Critical'}
                    </StatusPill>
                  )}
                  {project.inProgressRuns > 0 && (
                    <div className="proj-card-live-badge">
                      <span className="proj-card-live-dot" />
                      {project.inProgressRuns} active
                    </div>
                  )}
                </div>
              </div>

              {/* Name + description */}
              <div className="proj-card-identity">
                <h2>{project.name}</h2>
                {project.description && <p>{project.description}</p>}
              </div>

              {/* Stats chips */}
              <div className="proj-card-chips">
                <StatChip label="cases" value={project.cases} />
                <StatChip label="bugs" value={project.openBugs} danger />
                <StatChip label="runs" value={project.runs} />
              </div>

              {/* Pass rate bar */}
              {project.cases > 0 && (
                <div className="proj-card-rate">
                  <div className="proj-card-rate-header">
                    <span>Pass rate</span>
                    <strong className={`proj-rate-val--${project.tone}`}>{project.passRate}%</strong>
                  </div>
                  <MiniBar pct={project.passRate} tone={project.tone} />
                </div>
              )}

              {/* Footer: team + last run + actions */}
              <div className="proj-card-footer">
                <div className="proj-card-footer-left">
                  {project.projectMembers.length > 0 && (
                    <div className="avatar-row proj-card-avatars">
                      {project.projectMembers.slice(0, 4).map(m => <Avatar key={m.id} name={m.name} />)}
                      {project.projectMembers.length > 4 && (
                        <span className="avatar proj-avatar-more" style={{ width: 26, height: 26, fontSize: 10 }}>
                          +{project.projectMembers.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {project.lastRun && (
                    <span className="proj-card-last-run">
                      Last run {new Date(project.lastRun.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="proj-card-actions">
                  <Link
                    to={`/projects/${project.id}/dashboard`}
                    className="primary-button"
                    style={{ textDecoration: 'none', fontSize: 12, padding: '5px 12px' }}
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
                          message: `All test cases, bugs, and runs in "${project.name}" will be permanently deleted and cannot be recovered.`,
                          confirmLabel: 'Delete project',
                          danger: true,
                          requireText: project.name,
                        })
                        if (ok) removeProject(project.id)
                      }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
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
                      <input type="checkbox" checked={form.memberIds.includes(m.id)} onChange={() => toggleMember(m.id)} />
                      <Avatar name={m.name} />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => { setShowAdd(false); setForm(blank) }}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Creating…' : 'Create project'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
