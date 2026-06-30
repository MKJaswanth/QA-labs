import * as XLSX from 'xlsx'
import { newId } from './id'

// Column aliases — maps spreadsheet header → internal key
const COL = {
  'tc id':            'sourceTcId',
  'module':           'module',
  'test scenario':    'scenario',
  'test case title':  'title',
  'pre-conditions':   'preconditions',
  'preconditions':    'preconditions',
  'test steps':       'stepsRaw',
  'test data':        'testData',
  'expected result':  'expected',
  'actual result':    'actual',
  'status':           'statusRaw',
  'dev remarks':      'devRemarks',
  'qa remarks':       'qaRemarks',
}

const REQUIRED = ['title', 'module', 'stepsRaw', 'expected']

const STATUS_MAP = {
  pass: 'Pass', passed: 'Pass',
  fail: 'Fail', failed: 'Fail',
  skip: 'Skipped', skipped: 'Skipped',
  blocker: 'Blocker',
  'not executed': 'Not Executed', pending: 'Not Executed', 'not run': 'Not Executed', '': 'Not Executed',
}

function normaliseStatus(raw) {
  return STATUS_MAP[(raw ?? '').toLowerCase().trim()] ?? 'Not Executed'
}

function splitSteps(raw) {
  if (!raw) return []
  return String(raw)
    .split(/\r?\n|;|(?=\d+[.)]\s)/)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

function normaliseHeader(h) {
  return String(h ?? '').toLowerCase().trim()
}

/** Parse a single worksheet into rows, tagging each row with the given folder name. */
function parseSheet(ws, folderName, startRowNum) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (raw.length < 2) return []

  const headerRow = raw[0]
  const colMap = Object.create(null)
  headerRow.forEach((h, i) => {
    const key = COL[normaliseHeader(h)]
    if (key) colMap[i] = key
  })

  return raw.slice(1)
    .map((cells, rowIdx) => {
      const data = Object.create(null)
      Object.keys(colMap).forEach((i) => {
        data[colMap[i]] = String(cells[i] ?? '').trim()
      })
      if (folderName) data.folder = folderName

      const errors = REQUIRED
        .filter((k) => !data[k])
        .map((k) => {
          const label = Object.entries(COL).find(([, v]) => v === k)?.[0] ?? k
          return `Missing: ${label}`
        })

      return { rowNum: startRowNum + rowIdx, data, errors }
    })
    .filter((r) => {
      // Skip rows where every non-folder field is empty
      return Object.entries(r.data)
        .filter(([k]) => k !== 'folder')
        .some(([, v]) => v)
    })
}

/**
 * Parse an ArrayBuffer from a .xlsx/.xls/.csv file.
 * Multi-sheet XLSX: each sheet name becomes data.folder on its rows.
 * Returns { rows, isMultiSheet, sheetNames }.
 */
export function parseTestCaseFile(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const type = ext === 'csv' ? 'string' : 'array'

  const wb = XLSX.read(type === 'string' ? new TextDecoder().decode(buffer) : buffer, {
    type,
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
  })

  // Multi-sheet XLSX → each sheet becomes a folder
  if (ext !== 'csv' && wb.SheetNames.length > 1) {
    const allRows = []
    let rowOffset = 2
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName]
      const sheetRows = parseSheet(ws, sheetName, rowOffset)
      allRows.push(...sheetRows)
      rowOffset += sheetRows.length
    })
    return { rows: allRows, isMultiSheet: true, sheetNames: wb.SheetNames }
  }

  // Single sheet (CSV or single-sheet XLSX)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return { rows: parseSheet(ws, null, 2), isMultiSheet: false, sheetNames: wb.SheetNames }
}

/** Convert a validated ParsedRow.data into the app's TestCase model */
export function rowToTestCase(data) {
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    sourceTcId: data.sourceTcId || '',
    folder: data.folder || '',
    title: data.title,
    module: data.module || '',
    scenario: data.scenario || '',
    preconditions: data.preconditions || '',
    steps: splitSteps(data.stepsRaw),
    testData: data.testData || '',
    expected: data.expected || '',
    actual: data.actual || '',
    status: normaliseStatus(data.statusRaw),
    priority: 'Med',
    assignee: '',
    devRemarks: data.devRemarks || '',
    qaRemarks: data.qaRemarks || '',
  }
}
