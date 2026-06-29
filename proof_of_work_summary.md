# QA Lab — Proof of Work & Accomplishments Report
**Date:** June 18, 2026  
**Status:** Completed & Deployed to Branch `feature/workspace-sync-source-of-truth`

---

## 1. Project Overview: What is QA Lab?

**QA Lab** is a collaborative, lightweight Quality Assurance and test management application designed for agile product teams. It serves as a modern, high-efficiency replacement for traditional spreadsheets and complex legacy tools like TestRail or Zephyr.

### Core Features & Value Proposition
* **Test Case Repository:** Structure test suites by modules, write detailed pre-conditions, steps, expected results, and attach files.
* **Run Execution & Live Autologging:** Execute test runs with real-time pass/fail recording, status updates, and automatic bug logging upon test case failures.
* **Release Readiness & Analytics:** Evaluate build quality on a dashboard featuring pass rates, blocker counts, and automated project readiness assessments.
* **Activity & Auditing:** Record and display all state mutations in an auditing ledger to keep team members synced on who updated what, and when.
* **Cloud Sync with Local Cache:** Synchronize workspace data seamlessly with Firebase Firestore for authenticated team collaboration while falling back to cached local storage offline.

---

## 2. Historical Accomplishments (Yesterday/Today)

### Production & Firebase Infrastructure
* **CI/CD Fixes:** Resolved Firebase environment variables in GitHub Actions pipelines.
* **Firebase Config:** Moved configurations from GitHub secrets to project variables to prevent build pipelines from dropping Firestore configs during deployment.
* **Authoritative Sync:** Established Firebase Firestore as the live authoritative source-of-truth for signed-in users, restricting `localStorage` to local caching to prevent data synchronization mismatches.
* **Data Migration:** Restored workspace data and copied key datasets (e.g., `EBCO` and `WhopperAds`) into `qa-lab-main`.
* **Project Registration Fix:** Resolved a bug preventing newly created projects from being written to Firestore.

### Reports & Release Readiness
* **Reports Reframing:** Refactored Global Reports into **Release Readiness** dashboards centered around the key question: *"Are we ready to release?"*
* **CSS & Layout Adjustments:**
  * Fixed broken Reports layout caused by a missing CSS closing brace.
  * Resolved element overlapping in Project Readiness where `open bugs` collided with the `Latest run` column.
  * Fixed bug reporting calculations where closed Critical bugs were still counted as active blocker defects.

### Dashboard & UI Spacing
* **Polish & Denseness:** Reworked Dashboard components (Recent Activity, High-Priority Bugs, Recent Runs, Active Blockers) into clean, grid-aligned, professional modules.
* **Activity Spacing:** Fixed text overlapping between timestamps and entity types in the Recent Activity feed.
* **Activity Text Wrapping:** Configured details to wrap properly instead of overflowing bounding containers.

### Test Runs & Pagination
* **Pagination Controls:** Implemented pagination (10, 25, 100 sizes), "showing" counts, and Prev/Next page buttons across test run history and case execution tables.
* **Mobile Fallback:** Added adaptive mobile cards for lists under 640px to prevent critical tables from disappearing on mobile browsers.

---

## 3. Today's Core Accomplishments (Bug ID & Reporting Fixes)

Today, we focused on correcting bug tracking fields, standardizing bug ID allocations, and ensuring complete display and export consistency.

### A. Dynamic Reporter Resolution (User IDs $\rightarrow$ Display Names)
* **Problem:** When bugs were logged automatically during test runs or via detail panels, their `Reported By` field was saved as a Firebase UID (e.g., `u9s8okTTSPPXtWRkcBWF3ofBEkc2`), showing up in CSV reports and edit modals as a raw hash.
* **Solution:** Created a `getReporterName` utility inside `src/utils/export.js`. It detects UID-like formats (alphanumeric strings of length 20–36) and resolves them to the user's human name (stored as `reportedByName`), falling back safely to whatever string is present.
* **Impact:** 
  * Exported CSV bug reports now list human names in the **Reported By** column.
  * Opening the bug edit form displays the human name instead of a cryptic UID hash. Saving edits preserves the human name.

### B. Automated Reporting Date Stamps
* **Problem:** Bugs logged automatically or manually from test run runs or from detail pages did not set `reportedDate`, leaving the column blank on screen and in CSV reports.
* **Solution:** Added a default date fallback inside `addBug` within `src/hooks/useBugs.js`. If `reportedDate` is missing or empty upon bug creation, it is stamped with the current local date (`YYYY-MM-DD`).

### C. Standardized Bug ID Format
* **Problem:** Bug IDs defaulted to random hexadecimal UUIDs, which were difficult to remember or references.
* **Solution:** Programmed a sequential, module-based bug ID allocator in `src/hooks/useBugs.js`. When a bug is logged without a custom ID, it automatically generates a standard identifier:
  $$\text{BUG-}[\text{Module Code}]-\text{Sequence Number}$$
  * **Module Code:** Extracts the first two letters of the module in uppercase (e.g., `"Login"` $\rightarrow$ `LO`, `"Auth"` $\rightarrow$ `AU`). Empty or unspecified modules fallback to `GE` (General).
  * **Sequence:** Queries all existing bugs in the project to find the highest sequence number and increments it (e.g., `BUG-LO-001`, `BUG-AU-002`, `BUG-GE-003`).
  * **Import Protection:** Preserves existing IDs during CSV spreadsheet imports.

### D. UI Consistency & Table Headers
* **Problem:** The CSV exporter used the label `'Bug ID'`, while the UI tables labeled columns as `'ID'`.
* **Solution:** 
  * Renamed the column header in BugTrackerPage.jsx to `Bug ID`.
  * Added a `Bug ID` column to the linked bugs table in TestCaseDetailPage.jsx showing the standard sequential IDs.

---

## 4. Immediate Next Step: Shared Metrics Utility

To prevent future discrepancy bugs, the next crucial step is creating a **shared reports metrics utility** (`reportMetrics.js`) to unify calculations across the Dashboard, Release Readiness, Project Reports, and project dashboard cards.

```
                  src/utils/reportMetrics.js
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   DashboardPage      Release Readiness     ProjectReportsPage
```

This shared utility will eliminate:
1. Closed defects incorrectly appearing as active blocker count.
2. Mismatched "Open Bugs" statistics across different screens.
3. Minor variances in pass rate percentage rounding.
4. Mismatch in project readiness statuses.
