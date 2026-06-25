import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useProjects } from '../hooks/useProjects'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { useUser } from '../context/UserContext'
import { validateProjectInviteToken } from '../utils/remoteStorage'
import { auth } from '../utils/firebase'
import { newId } from '../utils/id'

export function JoinPage() {
  const { token } = useParams()
  const { firebaseUser } = useAuth()
  const { user } = useUser()
  const { projects, updateProject } = useProjects()
  const { members, addMember } = useTeamMembers()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | joining | done | invalid
  const [projectName, setProjectName] = useState('')

  useEffect(() => {
    if (!firebaseUser || !token) return

    validateProjectInviteToken(token).then((resolvedProjectId) => {
      if (!resolvedProjectId) { setStatus('invalid'); return }

      const project = projects.find((p) => p.id === resolvedProjectId)
      if (!project) { setStatus('invalid'); return }

      setProjectName(project.name)
      setStatus('joining')

      const uid = auth?.currentUser?.uid
      const memberIds = project.memberIds ?? []

      // Find or create the team member record for this user
      let member = members.find((m) => m.uid === uid)
      if (!member) {
        member = members.find((m) => m.name.toLowerCase() === (user || '').toLowerCase())
      }

      if (!member) {
        // First time — create a Viewer member record
        member = addMember(user || firebaseUser.displayName || 'Guest', 'Viewer')
      }

      // Add to project.memberIds if not already there
      if (!memberIds.includes(member.id)) {
        updateProject({ ...project, memberIds: [...memberIds, member.id] })
      }

      setStatus('done')
      setTimeout(() => navigate(`/projects/${resolvedProjectId}/test-cases`), 1500)
    })
  }, [firebaseUser, token, projects, members])   // eslint-disable-line react-hooks/exhaustive-deps

  // Not signed in — prompt to sign in first
  if (!firebaseUser) {
    return (
      <div className="auth-backdrop">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-brand"><span>QA Lab</span></div>
          <h1 className="auth-title">You've been invited!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Sign in or create an account to join this project.
          </p>
          <a href="#/" className="primary-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Sign in to continue
          </a>
        </div>
      </div>
    )
  }

  const messages = {
    checking: 'Verifying invite link…',
    joining:  projectName ? `Adding you to "${projectName}"…` : 'Joining project…',
    done:     projectName ? `You're in! Opening "${projectName}"…` : 'Done! Redirecting…',
    invalid:  'This invite link is invalid or has been revoked.',
  }

  return (
    <div className="app-loading">
      <div className="app-loading-card" style={{ textAlign: 'center', gap: '12px' }}>
        {status !== 'invalid' && <div className="app-loading-spinner" aria-label="Loading" />}
        <p style={{ margin: 0, color: status === 'invalid' ? 'var(--danger)' : 'var(--text-strong)' }}>
          {messages[status]}
        </p>
        {status === 'invalid' && (
          <a href="#/" className="secondary-button" style={{ textDecoration: 'none', marginTop: '8px' }}>Go home</a>
        )}
      </div>
    </div>
  )
}
