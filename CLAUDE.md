# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product context

Cricket AI Analyst is an AI-powered coaching tool. Users upload cricket videos and receive automated shot analysis, technique feedback, and downloadable reports. The UI is complete (mock data); the backend pipeline is the next phase. See the pipeline and integration points documented in the Key patterns section below.

## Code quality standards

- **Consistency is non-negotiable**: every new UI element must use the established design tokens, fonts, and spacing. Never hardcode a color or font that has an existing token.
- **Font usage is strict**: use `font-frama font-black` for page/section titles, `font-machina font-[800]` for labels/CTAs/sub-headers, `font-machina` (regular) for body copy, `font-sans` for fine print only. Do not mix these up.
- **No one-off styles**: if a new color, spacing, or shadow is needed that doesn't exist as a token, discuss before adding it.
- **TypeScript**: no `any` types. All component props must be typed. API response shapes must extend or match `ShotAnalysisData` in `src/lib/types.ts`.
- **Components**: keep them single-responsibility. Server components by default; add `'use client'` only when needed (event handlers, hooks, browser APIs).
- **No dead code**: don't leave commented-out blocks, unused imports, or placeholder TODOs without a clear action comment.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # next build (Next.js handles TS and ESLint internally)
npm run lint     # eslint only
```

No test suite is configured yet.

## Architecture

**Next.js 15 App Router** with TypeScript and Tailwind CSS v3. Two implemented routes:
- `/` — upload screen (`src/app/page.tsx`)
- `/analyze` — analysis screen (`src/app/analyze/page.tsx`)

`/dashboard` is linked from the Sidebar but the route does not exist yet.

Both pages are server components that compose client components from `src/components/`.

### Component layout

```
src/components/
  layout/Sidebar.tsx        — shared nav; "Analyze Video" (/) and "Dashboard" (/dashboard); uses usePathname for active state
  ui/Badge.tsx              — status pill (completed / processing / failed)
  ui/CircularProgress.tsx   — SVG ring for confidence score; accepts optional size and strokeWidth props
  upload/DropZone.tsx       — drag-drop + file validation (MP4/MOV/AVI, max 5 GB) + Analyze button (client)
  upload/HowItWorks.tsx     — static 4-step info panel (self-start, fixed 300px wide)
  upload/RecentUploads.tsx  — table of past uploads (fully implemented; not placed on any page yet)
  analyze/ShotMetrics.tsx   — left panel: shot type, batting hand, confidence ring; receives ShotAnalysisData
  analyze/VideoPlayer.tsx   — center panel: cricket pitch SVG + pose-skeleton overlay + scrubber; needs shotType and side props
  analyze/ShotAnalysis.tsx  — right panel: AI verdict, key points, mic/waveform, download; receives ShotAnalysisData
```

Shared TypeScript interfaces live in `src/lib/types.ts` (`UploadRecord`, `ShotAnalysisData`, `KeyPoint`).

There are no API routes under `src/app/api/` yet.

### Design tokens

All tokens are CSS custom properties defined in `src/app/globals.css` and mirrored in `tailwind.config.ts`:

| Token | Value | Usage |
|---|---|---|
| `--brand` | `#E8D600` | Primary accent — CTAs, active nav, highlights |
| `--brand-hover` | `#F5E930` | Hover state for brand elements |
| `--background` | `#0a0a0a` | Page background |
| `--surface` | `#111111` | Card/panel backgrounds |
| `--surface-2` | `#1a1a1a` | Hover states, nested surfaces |
| `--foreground` | `#ededed` | Primary text |
| `--muted` | `#6b6b6b` | Secondary/placeholder text |

Tailwind utility names match: `bg-brand`, `bg-surface`, `text-muted`, etc.

### Typography

| Font | Tailwind class | Weight | Use |
|---|---|---|---|
| PP Frama | `font-frama` | 900 (`font-black`) | Page titles, h1–h2 |
| PP Neue Machina | `font-machina` | 800 (`font-[800]`) | Labels, sub-headers, CTAs, table headers |
| PP Neue Machina | `font-machina` | 400 | Body copy |
| Helvetica Neue | `font-sans` | 400 | Fine print, helper text |

Font files (woff2 + woff) are in `public/fonts/` and declared with `@font-face` in `globals.css`.

### Key patterns

- **Full-screen layouts**: both pages use `h-screen overflow-hidden` on the root, with the content area using `flex flex-1 overflow-hidden` so panels fill the viewport without scrolling.
- **Upload page layout**: `DropZone` fills remaining space (`flex-1`); `HowItWorks` sits beside it at `w-[300px] shrink-0 self-start` — the `self-start` prevents it from stretching to the container height.
- **Analyze button flow**: `DropZone` is a flex column — the dashed drop area fills available space, then a full-width "Analyze Video" button sits below it. The button is disabled until a file is selected; on click it runs `onAnalyze`, which does a simulated delay then calls `router.push('/analyze')`. Replace the `setTimeout` with the real upload + inference call.
- **Mock data in page files**: `MOCK_DATA` in `analyze/page.tsx` stands in for the real API response — this is the integration point for the backend pipeline.
- **Borders**: use `border-[rgba(255,255,255,0.07)]` inline rather than a utility class, since the value sits below Tailwind's opacity-modifier threshold. This pattern is used consistently across all panels and table rows.
- **One-off accent colors**: the AI Verdict box in `ShotAnalysis` uses `bg-[rgba(34,197,94,0.06)]` (green tint) — an intentional deviation from the brand palette; don't replicate this pattern elsewhere without reason.
- **Backend integration points**: `DropZone.onAnalyze()` (replace `setTimeout`) → upload to backend → inference pipeline (pose estimation, shot classification, confidence scoring, voice feedback) → response shape matches `ShotAnalysisData` → rendered by the 3-panel analyze screen. `MOCK_DATA` in `analyze/page.tsx` is the drop-in replacement target.
