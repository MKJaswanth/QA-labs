import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { WorkspaceGate } from './components/WorkspaceGate'
import { OnboardingWizard } from './components/OnboardingWizard'
import { AuthProvider } from './context/AuthContext'
import { WorkspaceSyncProvider } from './context/WorkspaceSyncContext'
import { useAuth } from './context/useAuth'
import { ConfirmProvider } from './context/ConfirmContext'
import { ToastProvider } from './context/ToastContext'
import { UserContext } from './context/UserContext'
import { useCurrentUser } from './hooks/useCurrentUser'
import { useProjects } from './hooks/useProjects'
import { isFirebaseEnabled } from './utils/firebase'
// AuthPage & LandingPage are eagerly loaded — they render outside the
// router/Suspense boundary (before the user is authenticated).
import { AuthPage } from './pages/AuthPage'
import { LandingPage } from './pages/LandingPage'
// All other pages are lazy-loaded so Vite can code-split them into separate
// chunks that are fetched only when the user navigates to that route.
const BackupPage = lazy(() => import('./pages/BackupPage').then(m => ({ default: m.BackupPage })))
const BugTrackerPage = lazy(() => import('./pages/BugTrackerPage').then(m => ({ default: m.BugTrackerPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProjectReportsPage = lazy(() => import('./pages/ProjectReportsPage').then(m => ({ default: m.ProjectReportsPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const TestCaseDetailPage = lazy(() => import('./pages/TestCaseDetailPage').then(m => ({ default: m.TestCaseDetailPage })))
const TestCasesPage = lazy(() => import('./pages/TestCasesPage').then(m => ({ default: m.TestCasesPage })))
const RequirementsPage = lazy(() => import('./pages/RequirementsPage').then(m => ({ default: m.RequirementsPage })))
const RequirementCoverageMatrixPage = lazy(() => import('./pages/RequirementCoverageMatrixPage').then(m => ({ default: m.RequirementCoverageMatrixPage })))
const TestRunDetailPage = lazy(() => import('./pages/TestRunDetailPage').then(m => ({ default: m.TestRunDetailPage })))
const TestRunsPage = lazy(() => import('./pages/TestRunsPage').then(m => ({ default: m.TestRunsPage })))
const TestPlansPage = lazy(() => import('./pages/TestPlansPage').then(m => ({ default: m.TestPlansPage })))
const ActivityPage = lazy(() => import('./pages/ActivityPage').then(m => ({ default: m.ActivityPage })))
const WorkspaceSettingsPage = lazy(() => import('./pages/WorkspaceSettingsPage').then(m => ({ default: m.WorkspaceSettingsPage })))
const ProjectDashboardPage = lazy(() => import('./pages/ProjectDashboardPage').then(m => ({ default: m.ProjectDashboardPage })))
const JoinPage = lazy(() => import('./pages/JoinPage').then(m => ({ default: m.JoinPage })))
const PublicReportPage = lazy(() => import('./pages/PublicReportPage').then(m => ({ default: m.PublicReportPage })))
import './App.css'

function NamePicker({ onDone }) {
  const [name, setName] = useState('')
  return (
    <div className="name-picker-backdrop">
      <div className="name-picker">
        <div className="name-picker-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.0" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </span>
          <span>QA Lab</span>
        </div>
        <h1>Welcome</h1>
        <p>Manage testing without the enterprise clutter.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) onDone(name.trim())
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
          />
          <button type="submit" className="primary-button" disabled={!name.trim()}>
            Get started
          </button>
        </form>
      </div>
    </div>
  )
}

const appRoutes = (
  <Suspense fallback={
    <div className="app-loading">
      <div className="app-loading-card" role="status" aria-live="polite">
        <div className="app-loading-spinner" aria-label="Loading" />
      </div>
    </div>
  }>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/backup" element={<BackupPage />} />
      <Route path="/projects/:projectId/dashboard" element={<ProjectDashboardPage />} />
      <Route path="/projects/:projectId/test-cases" element={<TestCasesPage />} />
      <Route path="/projects/:projectId/test-cases/:testCaseId" element={<TestCaseDetailPage />} />
      <Route path="/projects/:projectId/requirements" element={<RequirementsPage />} />
      <Route path="/projects/:projectId/requirements/:requirementId" element={<RequirementsPage />} />
      <Route path="/projects/:projectId/coverage-matrix" element={<RequirementCoverageMatrixPage />} />
      <Route path="/projects/:projectId/test-runs" element={<TestRunsPage />} />
      <Route path="/projects/:projectId/test-runs/:runId" element={<TestRunDetailPage />} />
      <Route path="/projects/:projectId/test-plans" element={<TestPlansPage />} />
      <Route path="/projects/:projectId/bugs" element={<BugTrackerPage />} />
      <Route path="/projects/:projectId/reports" element={<ProjectReportsPage />} />
      <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
      <Route path="/workspace/settings" element={<WorkspaceSettingsPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
)

function AppShell() {
  const { user, updateUser } = useCurrentUser()
  const { firebaseUser, loading } = useAuth()
  const { projects } = useProjects()
  const [showAuth, setShowAuth] = useState(false)
  // Show onboarding for new workspaces with no projects (check once on mount)
  const [showOnboarding, setShowOnboarding] = useState(
    () => projects.length === 0 && !localStorage.getItem('qa_onboarding_dismissed')
  )

  // Track if user was previously signed out
  const wasSignedOutRef = useRef(false)

  useEffect(() => {
    const isSignedOut = (isFirebaseEnabled && firebaseUser === null) || (!isFirebaseEnabled && user === null)
    if (isSignedOut) {
      wasSignedOutRef.current = true
    }
  }, [firebaseUser, user])

  // Redirect to dashboard upon successful sign-in
  useEffect(() => {
    const isAuthenticated = (isFirebaseEnabled ? !!firebaseUser : true) && !!user
    if (isAuthenticated && wasSignedOutRef.current) {
      window.location.hash = '#/dashboard'
      wasSignedOutRef.current = false
    }
  }, [firebaseUser, user])

  // Auto-populate display name from Firebase profile on first sign-in
  useEffect(() => {
    if (isFirebaseEnabled && firebaseUser && !user) {
      const name = firebaseUser.isAnonymous
        ? 'Guest'
        : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User')
      updateUser(name)
    }
  }, [firebaseUser, user, updateUser])

  useEffect(() => {
    if (isFirebaseEnabled && firebaseUser && user && !firebaseUser.isAnonymous) {
      import('./utils/remoteStorage').then(({ syncUserProfileRemote }) => {
        syncUserProfileRemote(firebaseUser, user)
      })
    }
  }, [firebaseUser, user])

  // Firebase auth still resolving
  if (isFirebaseEnabled && loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-card" role="status" aria-live="polite">
          <span className="app-loading-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 11 2 2 4-4" />
            </svg>
          </span>
          <div className="app-loading-spinner" aria-label="Loading" />
          <div>
            <strong>QA Lab</strong>
            <p className="app-loading-text">Preparing your workspace</p>
          </div>
        </div>
      </div>
    )
  }

  // Firebase enabled but not signed in → show landing page first, then auth on demand
  if (isFirebaseEnabled && !firebaseUser) {
    return showAuth
      ? <AuthPage onBack={() => setShowAuth(false)} />
      : <LandingPage onGetStarted={() => setShowAuth(true)} />
  }

  // localStorage mode: no name set → show name picker
  if (!user) {
    return (
      <UserContext.Provider value={{ user, updateUser }}>
        <NamePicker onDone={updateUser} />
      </UserContext.Provider>
    )
  }

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      <WorkspaceSyncProvider>
        <WorkspaceGate>
          <HashRouter>
            <ErrorBoundary>
              <Layout>
                {appRoutes}
              </Layout>
            </ErrorBoundary>
          </HashRouter>
          {showOnboarding && (
            <OnboardingWizard onComplete={() => {
              setShowOnboarding(false)
              localStorage.setItem('qa_onboarding_dismissed', '1')
            }} />
          )}
        </WorkspaceGate>
      </WorkspaceSyncProvider>
    </UserContext.Provider>
  )
}

export function App() {
  // Public report route — no auth required, render before any auth gate
  const isPublicReport = window.location.hash.startsWith('#/public-report/')
  if (isPublicReport) {
    const projectId = window.location.hash.replace('#/public-report/', '').split('/')[0]
    return (
      <Suspense fallback={<div className="pub-report-loading"><div className="app-loading-spinner" /></div>}>
        <PublicReportPage projectId={projectId} />
      </Suspense>
    )
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
