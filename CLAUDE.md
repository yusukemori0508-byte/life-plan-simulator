# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mirai Tree** (未来ツリー) is a Japanese personal finance simulator. Users input their financial profile, then step through life events (housing purchase, children, job changes) that affect a visual "gauge" score and projected future wealth. The app is a React 19 / Vite PWA with all UI text in Japanese.

## Commands

```bash
npm run dev       # Start dev server at localhost:5173 (LAN-accessible)
npm run build     # Production build to /dist
npm run lint      # ESLint on all .js/.jsx files
npm run preview   # Preview production build at localhost:4173
```

There is no test suite configured.

## Architecture

### Screen Flow

```
home → input → simulation → result → {action, timeline, ranking}
```

Navigation is managed entirely via `state.screen` in the global store. There is no React Router.

### State Management (`src/store/useAppStore.jsx`)

All global state lives in a single `AppProvider` (React Context + `useReducer`). Every component accesses it via `const { state, actions } = useAppStore()`.

Key state shape:
- `profileData` — user inputs (income, expenses, housing, family plans, NISA, etc.)
- `currentGauge` — 0–100 financial health score (visual feedback only)
- `treeLevel` — 1–4 visual tree stage derived from gauge
- `screen` — current page
- `simCurrentAge`, `triggeredEvents`, `selectedChoices` — simulation state
- `resultData` — year-by-year financial projection rows

`setProfile()` does a shallow merge (spread), so always pass partial objects.

### Financial Calculation Layer

The calculation stack has three distinct layers:

1. **`src/simulation.js`** — Core engine. Takes structured inputs and returns a row-per-year cash flow array (earnings, taxes, expenses, mortgage, pension, investments). This is the source of truth for financial projections.

2. **`src/simulationEngine.js`** — Adapter. Converts `profileData` + `selectedChoices` from the store into the format `simulation.js` expects. Calls `runFullSimulation()` which runs all three scenarios.

3. **`src/gaugeCalc.js`** — UX layer. Maps surplus rate to a 0–100 gauge score using fixed thresholds (40% surplus → 85pts, 25% → 72, 10% → 55, 2% → 38, −10% → 20). The gauge is **visual feedback**, not the financial model.

### Event System

- **`src/eventData.js`** — Event definitions. Each event has an `id`, choices with `gaugeDelta` values, and optional `incomeBoost`/`costOnce`/`housingType`/`eduPlan` fields.
- **`src/eventTrigger.js`** — Determines which events fire based on the user's current age and profile.
- **`src/eventOptions.js`** — Computes dynamic pricing/details for choices based on current profile state.
- **Damping** is applied to repeated events (car purchases, additional children) to prevent gauge swings from overwhelming users.

### Input Form (`src/components/InputScreen.jsx`)

A 7-step form (Basic → Family → Income → Housing → Expense → NISA → Result). Each step is a component under `src/components/steps/`. The `StepBar` manages current step index.

### Results (`src/components/ResultScreen.jsx`)

Always calculates and displays all **three scenarios**: pessimistic, standard, optimistic. Uses Recharts for charts (net assets over time, annual cash flow, education costs). Key metrics: depletion age, retirement viability.

## Key Conventions

### Units and Data Types
- All monetary values are in **万円** (10,000 yen units), never raw yen
- Ages are plain integers
- Gauge is clamped 0–100
- Surplus rate is a decimal (0.4 = 40%)
- Mortgage uses 元利均等 (fixed monthly payment) calculation

### Styling
- **Inline styles only** — no CSS framework, no CSS modules. `index.css` handles only global resets/fonts.
- Reusable UI primitives (`Button`, `Card`, `Input`, `Select`, etc.) are in `src/components/ui.jsx`
- Font: Noto Sans JP. Primary palette: greens (#16a34a, #22c55e), amber (#f59e0b), red (#ef4444)
- Gauge color coding: ≥80 green (safe), 70–79 yellow-green, 50–69 orange (caution), <50 red (risk)
- Mobile-first full-screen layout (100vh, overflow hidden)

### Code Style
- Pure JSX — **no TypeScript**, no type annotations
- All UI labels and messages are in Japanese
- Japanese comments at top of files explain module purpose; ASCII `────` dividers separate sections
- `useAppStore()` is the only way to access global state — no prop drilling beyond 2 levels
- ESLint v9 flat config: unused vars allowed if UPPERCASE or `_`-prefixed

### Spouse Model
The optional spouse (配偶者) tracks income, a return-to-work age, and separate pension calculation — these fields must be respected throughout the simulation when present.
