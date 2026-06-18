# WheelTodo

**Spin. Focus. Done.**

A productivity app that turns your task list into a spinning wheel — so you stop overthinking and start doing. Available as a **React Native mobile app** (iOS + Android) and a **Next.js web app**, backed by Supabase.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development](#development)
- [Testing](#testing)
- [Backend & AI](#backend--ai)
- [Branches](#branches)
- [Documentation](#documentation)

---

## Overview

WheelTodo solves decision paralysis. Add tasks to the wheel, spin it, and the app decides for you. The selected task launches into a Pomodoro-style focus timer.

On rest days, **Rest Mode** lets you log recovery activities that still count towards your streak — so a rest day never breaks your momentum.

**AI features** powered by Claude (Anthropic):
- Voice input → extracts tasks + context from what you say
- AI subtask breakdown → conversational multi-turn flow that generates a step-by-step plan
- Smart category suggestion → learns from corrections
- Gentle Push → daily quick-win suggestions to start the day

---

## Features

| Feature | Description |
|---------|-------------|
| **Task Wheel** | 8-colour spinning wheel — spin to randomise or tap a slice |
| **Pomodoro Timer** | Focus sessions with configurable duration and live progress |
| **Rest Mode** | Preset + custom rest activities; mood-based suggestions |
| **Gentle Push** | Daily quick-win cards for tasks and rest (seeded by date) |
| **AI Subtask Breakdown** | Multi-turn conversational breakdown; uses voice context to skip clarifying questions |
| **Voice Input** | Hold-to-record; extracts tasks + background context |
| **Category Suggestion** | AI suggests a category as you type; learns from corrections |
| **Theme System** | 4 themes: Warm Start · Slow Down · Gentle Boost · Grounding Mode |
| **Achievements** | 6 tracks (streak, tasks, focus, speed, rest, spins) with unlockable tiers |
| **Streak System** | Daily activity tracked across completions and rest days |
| **Calendar Sync** | Google Calendar two-way sync (backend ready; frontend in progress) |
| **History** | Completed task log with weekly navigation |
| **Offline First** | All data stored locally; optional cloud sync via Supabase |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | [Expo](https://expo.dev) (SDK 52+) + React Native |
| Web | [Next.js](https://nextjs.org) 15 (App Router) |
| Shared | TypeScript package (`@todo/shared`) |
| Backend | [Supabase](https://supabase.com) — Postgres + Auth + Edge Functions |
| AI | [Anthropic Claude](https://anthropic.com) (Haiku for extraction/suggestions, Sonnet for voice) |
| Icons | [Lucide](https://lucide.dev) |
| Deployment | Vercel (web) · EAS (mobile) |

---

## Project Structure

```
wheeltodo/
├── apps/
│   ├── mobile/               # Expo React Native (iOS + Android)
│   └── web/                  # Next.js web app
│       └── src/
│           ├── app/          # App Router pages
│           ├── components/   # UI components + tab views
│           ├── context/      # AppContext (global state)
│           └── utils/        # achievements, db helpers
├── packages/
│   └── shared/               # @todo/shared — themes, db types, Supabase client
│       └── src/
│           ├── themes.ts     # 4 themes + 8-colour palettes
│           ├── db.ts         # DB types + Supabase query helpers
│           └── index.ts      # TaskSchema (Zod)
├── supabase/
│   ├── migrations/           # Postgres migrations (applied via CLI)
│   └── functions/            # Deno edge functions
│       ├── _shared/          # Shared helpers (Anthropic, Google Calendar)
│       ├── break-task/       # AI subtask generation (multi-turn)
│       ├── voice-tasks/      # Voice transcript → task list
│       ├── suggest-category/ # AI category suggestion
│       ├── calendar-connect/ # Google OAuth flow
│       ├── calendar-push/    # Task → Google Calendar event
│       └── calendar-pull/    # Google Calendar events → tasks
├── docs/                     # Full product + technical docs
├── scripts/                  # setup.sh for new teammates
├── vitest.workspace.ts       # Test workspace (shared + web + edge functions)
└── TEAM.md                   # Team working guide
```

---

## Quick Start

**Prerequisites:** Node 20+, npm 10+

```bash
git clone git@github-alexsuakim:ionstudioapps/wheeltodo.git
cd wheeltodo
npm install

# Copy and fill in your env vars
cp apps/web/.env.local.example apps/web/.env.local
```

```bash
# Web
npm run dev:web       # http://localhost:3000

# Mobile
npm run dev:mobile    # Expo dev server — scan QR with Expo Go
```

---

## Development

```bash
npm run dev:web        # Next.js dev server
npm run dev:mobile     # Expo dev server
npm run typecheck      # TypeScript check (shared package)
npm run lint           # ESLint (web app)
npm test               # Run all tests (see Testing below)
npm run test:watch     # Watch mode
```

---

## Testing

Tests run with [Vitest](https://vitest.dev) across three workspaces:

| Workspace | What's tested |
|-----------|--------------|
| `shared` | Theme palette/structure, TaskSchema validation |
| `web` | Achievement logic (`getNextAchievement`, `getUnlockedTierIds`) |
| `edge-functions` | break-task logic + handler, voice-tasks logic + handler, `buildGcalEvent` |

```bash
npm test               # one-shot (CI)
npm run test:watch     # interactive watch mode
```

Edge function tests use dependency injection — `requireAuth` and `callAnthropic` are mocked so no real API calls are made.

---

## Backend & AI

See [`supabase/README.md`](./supabase/README.md) for the full DB schema and migration history.  
See [`supabase/functions/README.md`](./supabase/functions/README.md) for each edge function's API.

**Secrets required** in Supabase → Project Settings → Edge Functions:

| Secret | Used by |
|--------|---------|
| `ANTHROPIC_API_KEY` | break-task, voice-tasks, suggest-category |
| `GOOGLE_CLIENT_ID` | calendar-connect |
| `GOOGLE_CLIENT_SECRET` | calendar-connect |
| `APP_URL` | calendar-connect (OAuth redirect back to app) |

---

## Branches

| Branch | Status | Description |
|--------|--------|-------------|
| `main` | ✅ Deployed | Stable — theme switcher, Gentle Push, 8-colour wheel |
| `feature/backend` | 🔍 Review ready | DB schema sync, auth hardening, multi-turn subtask UI |
| `feature/calendar` | 🚧 In progress | Google Calendar integration, voice context capture, tests |
| `redesign-prototype` | 🎨 Design | Visual redesign exploration |

---

## Documentation

| Document | Contents |
|----------|---------|
| [`docs/FEATURES.md`](./docs/FEATURES.md) | Complete feature reference |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Navigation structure, data flow, Mermaid diagrams |
| [`docs/SCREENS.md`](./docs/SCREENS.md) | Screen-by-screen breakdown |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | TypeScript types and context API |
| [`TEAM.md`](./TEAM.md) | Working agreements, branch strategy, PR process |
| [`supabase/README.md`](./supabase/README.md) | Database schema + edge functions |

---

## License

MIT
