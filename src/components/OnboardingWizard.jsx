import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useRequirements } from '../hooks/useRequirements'
import { useTestCases } from '../hooks/useTestCases'
import { useToast } from '../context/useToast'

const STEPS = [
  { id: 'project', title: 'Create your first project', description: 'Projects group test cases, bugs, and runs together.' },
  { id: 'team', title: 'Add team members', description: 'Invite your QA team so everyone can collaborate.' },
  { id: 'requirements', title: 'Add requirements or test cases', description: 'Start with what needs to be tested.' },
  { id: 'run', title: 'Start your first test run', description: 'Execute test cases and record results.' },
]

function StepIndicator({ current, total }) {
  return (
    <div className="onboarding-steps">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`onboarding-step ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
          <div className="onboarding-step-dot">
            {i < current ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 11 2 2 4-4" />
              </svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          {i < total - 1 && <div className="onboarding-step-line" />}
        </div>
      ))}
    </div>
  )
}

function ProjectStep({ onComplete }) {
  const { addProject } = useProjects()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    addProject({
      name: name.trim(),
      description: description.trim(),
      memberIds: [],
    })
    toast.success('Project created')
    onComplete()
  }

  return (
    <form className="onboarding-form" onSubmit={handleSubmit}>
      <label>
        Project name <span className="required">*</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mobile App v2.1"
        />
      </label>
      <label>
        Description <span className="hint">(optional)</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
        />
      </label>
      <div className="onboarding-actions">
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Create project
        </button>
      </div>
    </form>
  )
}

function TeamStep({ onComplete }) {
  const { members, addMember } = useTeamMembers()
  const toast = useToast()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Tester')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    addMember(name.trim(), role)
    toast.success(`${name.trim()} added as ${role}`)
    setName('')
  }

  return (
    <div>
      <form className="onboarding-form" onSubmit={handleAdd}>
        <div className="form-row">
          <label>
            Name <span className="required">*</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team member name"
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Tester</option>
              <option>QA Lead</option>
              <option>Viewer</option>
            </select>
          </label>
        </div>
        <button type="submit" className="secondary-button" disabled={!name.trim()}>
          + Add member
        </button>
      </form>

      {members.length > 0 && (
        <div className="onboarding-member-list">
          {members.map((m) => (
            <div key={m.id} className="onboarding-member">
              <span className="onboarding-member-avatar">{m.name.charAt(0).toUpperCase()}</span>
              <span className="onboarding-member-name">{m.name}</span>
              <span className="onboarding-member-role">{m.role}</span>
            </div>
          ))}
        </div>
      )}

      <div className="onboarding-actions" style={{ marginTop: 16 }}>
        <button type="button" className="ghost-button" onClick={onComplete}>
          Skip for now
        </button>
        <button type="button" className="primary-button" onClick={onComplete}>
          Continue
        </button>
      </div>
    </div>
  )
}

function RequirementsStep({ onComplete, projectId }) {
  const toast = useToast()
  const { addRequirement } = useRequirements(projectId)
  const { addTestCase } = useTestCases(projectId)
  const [items, setItems] = useState([{ title: '', description: '' }])
  const [mode, setMode] = useState('requirements') // 'requirements' | 'testcases'

  const addItem = () => setItems([...items, { title: '', description: '' }])
  const updateItem = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    setItems(next)
  }
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i))

  const handleSave = () => {
    const valid = items.filter((item) => item.title.trim())
    if (valid.length === 0) {
      toast.error('Add at least one item')
      return
    }
    valid.forEach((item) => {
      if (mode === 'requirements') {
        addRequirement({ title: item.title.trim(), description: item.description.trim() })
      } else {
        addTestCase({ title: item.title.trim(), expected: item.description.trim() })
      }
    })
    toast.success(`${valid.length} ${mode === 'requirements' ? 'requirement' : 'test case'}${valid.length !== 1 ? 's' : ''} added`)
    onComplete()
  }

  return (
    <div>
      <div className="onboarding-mode-toggle">
        <button
          type="button"
          className={mode === 'requirements' ? 'active' : ''}
          onClick={() => setMode('requirements')}
        >
          Requirements
        </button>
        <button
          type="button"
          className={mode === 'testcases' ? 'active' : ''}
          onClick={() => setMode('testcases')}
        >
          Test cases
        </button>
      </div>

      <p className="onboarding-hint">
        {mode === 'requirements'
          ? 'What should the software do? Add high-level requirements.'
          : 'How do you test it? Add test cases with steps.'}
      </p>

      <div className="onboarding-items">
        {items.map((item, i) => (
          <div key={i} className="onboarding-item">
            <input
              autoFocus={i === 0}
              value={item.title}
              onChange={(e) => updateItem(i, 'title', e.target.value)}
              placeholder={mode === 'requirements' ? 'Requirement title' : 'Test case title'}
            />
            <input
              value={item.description}
              onChange={(e) => updateItem(i, 'description', e.target.value)}
              placeholder="Description (optional)"
            />
            {items.length > 1 && (
              <button type="button" className="onboarding-item-remove" onClick={() => removeItem(i)} aria-label="Remove">
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="ghost-button" onClick={addItem} style={{ marginBottom: 16 }}>
        + Add another
      </button>

      <div className="onboarding-actions">
        <button type="button" className="ghost-button" onClick={onComplete}>
          Skip for now
        </button>
        <button type="button" className="primary-button" onClick={handleSave}>
          Save & continue
        </button>
      </div>
    </div>
  )
}

function RunStep({ onComplete }) {
  return (
    <div className="onboarding-final">
      <div className="onboarding-final-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      </div>
      <h3>You're all set!</h3>
      <p>
        Your project is ready. Here's what to do next:
      </p>
      <ol className="onboarding-checklist">
        <li>Add test cases to your project</li>
        <li>Link them to requirements</li>
        <li>Create a test plan for your release</li>
        <li>Start a test run and mark results</li>
        <li>Check the coverage matrix to see readiness</li>
      </ol>
      <div className="onboarding-actions">
        <button type="button" className="primary-button" onClick={onComplete}>
          Go to dashboard
        </button>
      </div>
    </div>
  )
}

function WelcomeStep({ onStart, onSkip }) {
  return (
    <>
      <div className="onboarding-header">
        <div className="onboarding-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </span>
          <span>QA Lab</span>
        </div>
        <h1>Welcome to QA Lab</h1>
        <p>Take a quick guided tour to set up your first project, or skip it and explore on your own.</p>
      </div>
      <div className="onboarding-body">
        <div className="onboarding-actions" style={{ justifyContent: 'center', marginTop: 8 }}>
          <button type="button" className="ghost-button" onClick={onSkip}>
            Skip, I'll explore
          </button>
          <button type="button" className="primary-button" onClick={onStart}>
            Take the tour
          </button>
        </div>
      </div>
    </>
  )
}

export function OnboardingWizard({ onComplete }) {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const { projects } = useProjects()
  const projectId = projects[0]?.id

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      onComplete()
    }
  }

  const stepProps = { onComplete: next, projectId }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        {!started ? (
          <WelcomeStep onStart={() => setStarted(true)} onSkip={onComplete} />
        ) : (
          <>
            <div className="onboarding-header">
              <div className="onboarding-brand">
                <span className="brand-mark" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 11 2 2 4-4" />
                  </svg>
                </span>
                <span>QA Lab</span>
              </div>
              <h1>{STEPS[step].title}</h1>
              <p>{STEPS[step].description}</p>
            </div>

            <StepIndicator current={step} total={STEPS.length} />

            <div className="onboarding-body">
              {step === 0 && <ProjectStep {...stepProps} />}
              {step === 1 && <TeamStep {...stepProps} />}
              {step === 2 && <RequirementsStep {...stepProps} />}
              {step === 3 && <RunStep {...stepProps} />}
            </div>

            {step < STEPS.length - 1 && (
              <div className="onboarding-footer">
                <button type="button" className="ghost-button" onClick={() => (step === 0 ? setStarted(false) : setStep(step - 1))}>
                  Back
                </button>
                <button type="button" className="ghost-button" onClick={onComplete}>
                  Skip tour
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
