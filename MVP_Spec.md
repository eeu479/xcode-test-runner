# Xcode Test Runner -- MVP Overview

## 1. Overview

**Xcode Test Runner** is a lightweight macOS desktop app that allows
developers to run Xcode test suites (from an Xcode project and multiple
Swift Package modules) and clearly visualise the results and history of
those runs.

The goal of the MVP is to: - Run tests quickly without navigating inside
Xcode. - Clearly see what passed, failed, and how long it took. - Review
past runs and spot patterns. - Re-run failures easily.

No deep CI integrations or advanced analytics are included in this MVP.

------------------------------------------------------------------------

## 2. Core User Goals

-   Run all tests in one click.
-   Select specific project schemes or Swift packages to test.
-   Instantly identify failures.
-   View test history.
-   Compare recent runs at a high level.

------------------------------------------------------------------------

## 3. UI Overview

### 3.1 Dashboard (Home)

Purpose: Provide a quick snapshot of the current state.

**Primary Actions** - Run All - Run Selected - Re-run Last Failed

**Status Tiles** - Last run result (Pass / Fail) - Total tests,
failures, skipped - Total duration - Recently failing tests (basic
"flaky suspects")

**Recent Runs List** Each entry shows: - Timestamp - Scope (Project /
Packages) - Result (Pass/Fail) - Duration

------------------------------------------------------------------------

### 3.2 Targets & Suites (Selection Screen)

Purpose: Select what to test.

**Sections** - Xcode Project (schemes / test bundles) - Swift Packages
(each module listed)

Each item includes: - Enable/disable checkbox - Quick action: Run -
Quick action: Run failing only (if available)

**Filters** - Search bar - "Show only failing from last run" toggle

------------------------------------------------------------------------

### 3.3 Run Details (Results Screen)

Purpose: Inspect a specific test run.

**Header** - Result (Pass/Fail) - Duration - Start/End time - Included
scopes

**Tabs** - Summary (counts, slowest tests) - Failures (failing tests
with error messages) - All Tests (tree or list view) - Logs (raw output
with search)

**Actions** - Copy failure summary - Export run report - Open related
test in Xcode (conceptual integration)

------------------------------------------------------------------------

### 3.4 History & Trends

Purpose: Review recent stability.

**Run Timeline** - Filter by scope - Filter by failures only - Date
filters (Today / 7d / 30d)

**Trend Widgets** - Average duration (last N runs) - Failure rate (last
N runs) - Slowest tests (recent runs)

------------------------------------------------------------------------

### 3.5 Settings

**Defaults** - Default scope (Project / Packages / Both)

**Run Behaviour** - Stop on first failure (toggle) - Continue all tests
(toggle)

**Notifications** - Notify on completion - Notify only on failure

**Storage** - Retain last X runs

------------------------------------------------------------------------

## 4. MVP Feature Set

### Test Execution

-   Run entire Xcode project test suites.
-   Run selected schemes.
-   Run individual Swift Package modules.
-   Presets:
    -   All
    -   Project only
    -   Packages only
    -   Last failed

### Results & Reporting

-   Run summary (pass/fail, duration, counts)
-   Failure list with readable messages
-   Searchable logs viewer
-   Copy formatted summary to clipboard
-   Export run report as file

### Run History

-   Persist past runs
-   View detailed breakdown per run
-   Show basic deltas vs previous run:
    -   Duration difference
    -   Failure count difference

### Quality of Life

-   Optional menu bar quick actions
-   Keyboard shortcuts:
    -   Run All
    -   Re-run failures
    -   Search

------------------------------------------------------------------------

## 5. Typical Usage Flows

### Daily Quick Check

1.  Open app → View last run status.
2.  Click Run All.
3.  Review Failures tab if needed.
4.  Copy summary to share.

### Package-Focused Development

1.  Go to Targets & Suites.
2.  Select relevant Swift Packages.
3.  Run Selected.
4.  Confirm stability in History view.

### Fixing a Red Build

1.  Click Re-run Last Failed.
2.  Inspect Failures tab.
3.  Iterate until green.

------------------------------------------------------------------------

## 6. Out of Scope (MVP)

-   Advanced flake detection
-   CI system integrations
-   Distributed or parallel orchestration
-   Complex tagging/filtering rules
-   Multi-repository management

------------------------------------------------------------------------

## 7. Success Criteria

The MVP is successful if: - A developer can run tests without opening
Xcode. - Failures are immediately visible and understandable. - Run
history is easily accessible. - Re-running failures is frictionless.
