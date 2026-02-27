# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Xcode Test Runner** is a macOS desktop app that runs Xcode test suites (project schemes and Swift Package modules) and visualizes results/history — without requiring developers to navigate inside Xcode.

The MVP spec is in `MVP_Spec.md`.

## Architecture

- **Platform**: macOS, Tauri v2 (Rust backend) + React 19 + TypeScript + Tailwind CSS v4 + Radix UI
- **Test execution**: Wraps `xcodebuild test` and `swift test` via tokio::process with real-time stdout streaming via Tauri Channels
- **Result parsing**: Parses xcresult bundles (via xcresulttool) and real-time stdout line parsing (regex-based)
- **Persistence**: SQLite via tauri-plugin-sql (frontend JS API), 3 tables: test_runs, test_cases, settings
- **State management**: Zustand (live execution state) + TanStack Query (persistent data)
- **Key screens**: Dashboard, Targets & Suites, Run Details (Summary/Failures/All Tests/Logs tabs), History & Trends, Settings

## Build & Run

```bash
# Install dependencies
npm install

# Development (hot reload for both frontend and Rust)
cargo tauri dev

# TypeScript type check
npx tsc --noEmit

# Build frontend only
npm run build

# Build Rust backend only
cargo build --manifest-path src-tauri/Cargo.toml

# Production build (.app bundle)
cargo tauri build
```

## Project Structure

- `src/` — React frontend (pages, components, hooks, stores, lib)
- `src-tauri/` — Rust backend (commands, models, execution, parsing, discovery, persistence)
- `src-tauri/migrations/` — SQLite migration SQL files
- `src-tauri/capabilities/` — Tauri v2 permission capabilities

## Key Patterns

- Tauri commands in `src-tauri/src/commands/` are the IPC boundary
- DB operations happen on the frontend via `src/lib/db.ts` using `@tauri-apps/plugin-sql`
- Live test output streams through Tauri Channels (not events)
- Zustand stores in `src/stores/` manage ephemeral UI state
- TanStack Query hooks in `src/hooks/` manage persistent data fetching
