export function historyEntry(type, user, details, from, to) {
  return {
    id: crypto.randomUUID(),
    type,
    user,
    timestamp: new Date().toISOString(),
    details,
    from,
    to,
  }
}

export function withHistory(item, entry) {
  return { ...item, history: [...(item.history || []), entry] }
}

export function describeTestCaseChanges(before, after) {
  const labels = {
    title: 'Title',
    module: 'Module',
    scenario: 'Scenario',
    preconditions: 'Pre-conditions',
    priority: 'Priority',
    assignee: 'Assignee',
    testData: 'Test data',
    expected: 'Expected result',
    actual: 'Actual result',
    status: 'Status',
    devRemarks: 'Dev remarks',
    qaRemarks: 'QA remarks',
  }

  const fieldChanges = Object.entries(labels)
    .filter(([key]) => (before[key] ?? '') !== (after[key] ?? ''))
    .map(([, label]) => `${label} changed`)

  if (JSON.stringify(before.steps || []) !== JSON.stringify(after.steps || [])) {
    fieldChanges.push('Steps updated')
  }

  if (JSON.stringify(before.tags || []) !== JSON.stringify(after.tags || [])) {
    fieldChanges.push('Tags updated')
  }

  return fieldChanges
}

export function createTestCaseVersionSnapshot(currentTc, user, changes = []) {
  const existingHistory = currentTc.versionHistory || []
  const nextVersion = existingHistory.length + 1

  return {
    version: nextVersion,
    timestamp: new Date().toISOString(),
    user: user || 'Anonymous',
    changes: changes.length ? changes : ['Initial version / baseline'],
    snapshot: {
      title: currentTc.title,
      module: currentTc.module || '',
      scenario: currentTc.scenario || '',
      priority: currentTc.priority || 'Med',
      status: currentTc.status,
      steps: currentTc.steps || [],
      expected: currentTc.expected || '',
      actual: currentTc.actual || '',
    },
  }
}
