import { useUser } from '../context/UserContext'
import { useTeamMembers } from './useTeamMembers'
import { auth } from '../utils/firebase'
import { getTeamMembersRaw, isDeleted } from '../utils/storage'

export function useUserRole() {
  const { user } = useUser()
  const { members } = useTeamMembers()

  const currentMember = members.find((m) => {
    if (auth?.currentUser?.uid && m.uid === auth.currentUser.uid) return true
    return m.name.toLowerCase() === (user || '').toLowerCase()
  })

  // Detect if user has been explicitly deleted/blocked from workspace
  const rawMembers = getTeamMembersRaw()
  const rawRecord = rawMembers.find((m) => {
    if (auth?.currentUser?.uid && m.uid === auth.currentUser.uid) return true
    return m.name.toLowerCase() === (user || '').toLowerCase()
  })
  const userIsDeleted = rawRecord ? isDeleted(rawRecord) : false

  let role
  if (userIsDeleted) {
    role = 'None'
  } else if (currentMember) {
    // If this user is the only member in the workspace, always grant QA Lead
    // to prevent permanent lockout from role changes.
    role = members.length === 1 ? 'QA Lead' : (currentMember.role || 'Viewer')
  } else {
    // No member record yet — first user or unsynced; grant QA Lead
    role = members.length === 0 ? 'QA Lead' : 'Viewer'
  }

  return {
    role,
    isLead: role === 'QA Lead',
    isTester: role === 'Tester',
    isViewer: role === 'Viewer',
    isDeleted: userIsDeleted,
  }
}

