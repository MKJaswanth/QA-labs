/** Metrics for test plans and milestones. */

function isRunComplete(run) {
  return Boolean(run?.completedAt)
}

/**
 * Compute the deduplicated set of test cases that fall within a plan's scope.
 * Scope is derived by traversing: Plan → requirementIds → requirement.testCaseIds.
 */
export function getPlanTestCases(plan, requirements = [], testCases = []) {
  const reqIds = new Set(plan?.requirementIds || [])
  const linkedReqs = requirements.filter((r) => reqIds.has(r.id))
  const tcIdSet = new Set()
  linkedReqs.forEach((r) => (r.testCaseIds || []).forEach((id) => tcIdSet.add(id)))
  return testCases.filter((tc) => tcIdSet.has(tc.id))
}

export function getPlanMetrics(plan, runs = [], requirements = [], testCases = [], bugs = []) {
  // Scope-based metrics — derived from Plan → Requirements → Test Cases
  const scopeCases = getPlanTestCases(plan, requirements, testCases)
  const scopeTotal = scopeCases.length
  const scopeCaseIds = new Set(scopeCases.map((tc) => tc.id))

  // Include explicitly linked runs AND runs that executed in-scope test cases
  const linkedRuns = runs.filter((r) => {
    if (r.testPlanId === plan?.id) return true
    if (scopeTotal > 0 && Array.isArray(r.cases)) {
      return r.cases.some((rc) => rc.testCaseId && scopeCaseIds.has(rc.testCaseId))
    }
    return false
  })
  const completedRuns = linkedRuns.filter(isRunComplete)

  // Run-level aggregates (kept for backward compat and display)
  const runTotalCases = linkedRuns.reduce((s, r) => s + (r.total ?? 0), 0)
  const runPassedCases = linkedRuns.reduce((s, r) => s + (r.passed ?? 0), 0)

  // Build a map of the latest status for each in-scope case from linked runs
  const latestStatus = {}
  // Process runs oldest-first so newer runs overwrite older statuses
  const chronoRuns = [...linkedRuns].sort(
    (a, b) => new Date(a.completedAt || a.startedAt || 0) - new Date(b.completedAt || b.startedAt || 0),
  )
  chronoRuns.forEach((run) => {
    ;(run.cases || []).forEach((rc) => {
      if (rc.testCaseId && scopeCaseIds.has(rc.testCaseId)) latestStatus[rc.testCaseId] = rc.status
    })
  })

  const scopeExecuted = scopeCases.filter(
    (tc) => latestStatus[tc.id] && latestStatus[tc.id] !== 'Not Executed',
  ).length
  const scopePassed = scopeCases.filter((tc) => latestStatus[tc.id] === 'Pass').length
  const scopeFailed = scopeCases.filter((tc) => latestStatus[tc.id] === 'Fail').length
  const scopeBlocked = scopeCases.filter((tc) => latestStatus[tc.id] === 'Blocker').length

  const linkedBugIds = new Set()
  linkedRuns.forEach((run) => {
    ;(run.cases || []).forEach((rc) => { if (rc.bugId) linkedBugIds.add(rc.bugId) })
  })
  const bugCount = bugs.filter((b) => linkedBugIds.has(b.id)).length

  // Progress: % of in-scope cases that have been executed
  // Falls back to run-completion % when scope info isn't available
  const progressPct = scopeTotal > 0
    ? Math.round((scopeExecuted / scopeTotal) * 100)
    : linkedRuns.length
      ? Math.round((completedRuns.length / linkedRuns.length) * 100)
      : 0

  // Pass rate: % of in-scope cases that passed
  const passRate = scopeTotal > 0
    ? Math.round((scopePassed / scopeTotal) * 100)
    : runTotalCases
      ? Math.round((runPassedCases / runTotalCases) * 100)
      : 0

  return {
    linkedRuns,
    totalRuns: linkedRuns.length,
    completedRuns: completedRuns.length,
    progressPct,
    passRate,
    scopeTotal,
    scopeExecuted,
    scopePassed,
    scopeFailed,
    scopeBlocked,
    bugCount,
    totalCases: scopeTotal || runTotalCases,
    passedCases: scopePassed || runPassedCases,
  }
}

export function getMilestoneMetrics(milestone, plans = [], runs = [], requirements = [], testCases = [], bugs = []) {
  const planIds = new Set([
    ...(milestone?.testPlanIds ?? []),
    ...plans.filter((p) => p.milestoneId === milestone?.id).map((p) => p.id),
  ])
  const linkedPlans = plans.filter((p) => planIds.has(p.id))
  const linkedPlanIds = new Set(linkedPlans.map((p) => p.id))

  // Aggregate scope across all linked plans
  const allScopeCaseIds = new Set()
  linkedPlans.forEach((plan) => {
    const cases = getPlanTestCases(plan, requirements, testCases)
    cases.forEach((tc) => allScopeCaseIds.add(tc.id))
  })
  const scopeTotal = allScopeCaseIds.size

  // Include explicitly linked runs AND runs that executed in-scope test cases
  const linkedRuns = runs.filter((r) => {
    if (r.testPlanId && linkedPlanIds.has(r.testPlanId)) return true
    if (scopeTotal > 0 && Array.isArray(r.cases)) {
      return r.cases.some((rc) => rc.testCaseId && allScopeCaseIds.has(rc.testCaseId))
    }
    return false
  })
  const completedRuns = linkedRuns.filter(isRunComplete)

  // Latest status per case from all milestone-linked runs
  const latestStatus = {}
  const chronoRuns = [...linkedRuns].sort(
    (a, b) => new Date(a.completedAt || a.startedAt || 0) - new Date(b.completedAt || b.startedAt || 0),
  )
  chronoRuns.forEach((run) => {
    ;(run.cases || []).forEach((rc) => {
      if (rc.testCaseId && allScopeCaseIds.has(rc.testCaseId)) {
        latestStatus[rc.testCaseId] = rc.status
      }
    })
  })

  const scopeExecuted = Object.values(latestStatus).filter((s) => s && s !== 'Not Executed').length
  const scopePassed = Object.values(latestStatus).filter((s) => s === 'Pass').length
  const scopeFailed = Object.values(latestStatus).filter((s) => s === 'Fail').length
  const scopeBlocked = Object.values(latestStatus).filter((s) => s === 'Blocker').length

  const linkedBugIds = new Set()
  linkedRuns.forEach((run) => {
    ;(run.cases || []).forEach((rc) => { if (rc.bugId) linkedBugIds.add(rc.bugId) })
  })
  const bugCount = bugs.filter((b) => linkedBugIds.has(b.id)).length

  // Fallback run-level aggregates
  const runTotalCases = linkedRuns.reduce((s, r) => s + (r.total ?? 0), 0)
  const runPassedCases = linkedRuns.reduce((s, r) => s + (r.passed ?? 0), 0)

  const progressPct = scopeTotal > 0
    ? Math.round((scopeExecuted / scopeTotal) * 100)
    : linkedRuns.length
      ? Math.round((completedRuns.length / linkedRuns.length) * 100)
      : 0

  const passRate = scopeTotal > 0
    ? Math.round((scopePassed / scopeTotal) * 100)
    : runTotalCases
      ? Math.round((runPassedCases / runTotalCases) * 100)
      : 0

  let daysLeft = null
  let onTrack = true
  if (milestone?.dueDate) {
    const due = new Date(milestone.dueDate)
    due.setHours(23, 59, 59, 999)
    daysLeft = Math.ceil((due - new Date()) / 86400000)
    if (daysLeft < 0) {
      onTrack = progressPct >= 100 || milestone?.status === 'Completed'
    } else if (daysLeft <= 3) {
      onTrack = progressPct >= 80
    } else {
      onTrack = progressPct >= 50 || daysLeft > 7
    }
  }

  return {
    linkedPlans,
    linkedRuns,
    totalPlans: linkedPlans.length,
    totalRuns: linkedRuns.length,
    completedRuns: completedRuns.length,
    progressPct,
    passRate,
    scopeTotal,
    scopeExecuted,
    scopePassed,
    scopeFailed,
    scopeBlocked,
    bugCount,
    totalCases: scopeTotal || runTotalCases,
    passedCases: scopePassed || runPassedCases,
    daysLeft,
    onTrack,
    overdue: daysLeft !== null && daysLeft < 0 && milestone?.status !== 'Completed',
  }
}
