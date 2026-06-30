import { useState } from 'react'
import { Modal } from './Modal'
import { EvidenceLinksField } from './EvidenceLinksField'
import { useUser } from '../context/UserContext'
import { useTeamMembers } from '../hooks/useTeamMembers'

const SEVERITIES = ['Critical', 'Major', 'Minor']
const PRIORITIES = ['High', 'Medium', 'Low']
const STATUSES = ['Open', 'In review', 'Closed']
const RETEST_STATUSES = ['Not Retested', 'Passed', 'Failed']

export function EditBugModal({ bug, projectId, onSave, onClose }) {
  const { user } = useUser()
  const { members } = useTeamMembers(projectId)

  const [form, setForm] = useState({
    title:            bug.title || '',
    description:      bug.description || '',
    stepsToReproduce: bug.stepsToReproduce || '',
    expected:         bug.expected || '',
    actual:           bug.actual || '',
    severity:         bug.severity || 'Major',
    priority:         bug.priority || 'Medium',
    status:           bug.status || 'Open',
    retestStatus:     bug.retestStatus || 'Not Retested',
    assignedTo:       bug.assignedTo || '',
    environment:      bug.environment || '',
    build:            bug.build || '',
    fixedInBuild:     bug.fixedInBuild || '',
    devRemarks:       bug.devRemarks || '',
    qaRemarks:        bug.qaRemarks || '',
    evidenceLinks:    bug.evidenceLinks || [],
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({ ...bug, ...form, updatedAt: new Date().toISOString(), updatedBy: user })
  }

  const bugId = bug.sourceBugId || bug.id?.slice(0, 8).toUpperCase()

  return (
    <Modal title={`Edit Bug ${bugId ? `· ${bugId}` : ''}`} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label>
          Title <span className="required">*</span>
          <input autoFocus value={form.title} onChange={set('title')} placeholder="Describe the defect" />
        </label>

        <label>
          Description
          <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Brief summary of the defect" />
        </label>

        <label>
          Steps to Reproduce
          <textarea value={form.stepsToReproduce} onChange={set('stepsToReproduce')} rows={3} placeholder={'1. Go to…\n2. Click…\n3. Observe…'} />
        </label>

        <div className="form-row">
          <label>
            Expected Result
            <textarea value={form.expected} onChange={set('expected')} rows={2} />
          </label>
          <label>
            Actual Result
            <textarea value={form.actual} onChange={set('actual')} rows={2} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Severity
            <select value={form.severity} onChange={set('severity')}>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Status
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Retest Status
            <select value={form.retestStatus} onChange={set('retestStatus')}>
              {RETEST_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Assigned To
            <select value={form.assignedTo} onChange={set('assignedTo')}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </label>
          <label>
            Environment
            <input value={form.environment} onChange={set('environment')} placeholder="e.g. Staging, iOS 17" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Build / Version
            <input value={form.build} onChange={set('build')} placeholder="e.g. v2.3.1" />
          </label>
          <label>
            Fixed In Build
            <input value={form.fixedInBuild} onChange={set('fixedInBuild')} placeholder="e.g. v2.3.2" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Developer Remarks
            <textarea value={form.devRemarks} onChange={set('devRemarks')} rows={2} />
          </label>
          <label>
            QA Remarks
            <textarea value={form.qaRemarks} onChange={set('qaRemarks')} rows={2} />
          </label>
        </div>

        <div>
          <label>Evidence links</label>
          <EvidenceLinksField
            evidenceLinks={form.evidenceLinks}
            onChange={(evidenceLinks) => setForm((f) => ({ ...f, evidenceLinks }))}
            currentUser={user}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">Save bug</button>
        </div>
      </form>
    </Modal>
  )
}
