# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product context

**Kabuni Cricket AI** is an AI-powered coaching tool. Users upload a **single ball clip** (one delivery — bowler release to batsman shot) and receive automated shot analysis, technique feedback, and downloadable reports. Uploading a full over or match will not work; the pipeline is designed for one delivery at a time. The frontend is fully wired to the FastAPI backend — no mock data in the normal flow.

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

`/` is a server component. `/analyze` is a `"use client"` component — it reads `sessionStorage.getItem("shotResult")` on mount and falls back to `MOCK_DATA` when visited directly.

### Component layout

```
src/components/
  layout/Sidebar.tsx        — single nav item: "Analyze Video" (/); uses usePathname for active state
  ui/Badge.tsx              — status pill (completed / processing / failed)
  ui/CircularProgress.tsx   — SVG ring for confidence score; accepts optional size and strokeWidth props
  upload/DropZone.tsx       — drag-drop + file validation (MP4/MOV/AVI, max 5 GB) + Analyze button (client)
  upload/HowItWorks.tsx     — 4-step info panel, 300px wide, max-h-full overflow-y-auto, self-start
  upload/RecentUploads.tsx  — table of past uploads (fully implemented; not placed on any page yet)
  analyze/ShotMetrics.tsx   — left panel: shot type, batting hand, confidence ring + optional ML metrics panel (quality badge, score bars, phase scores); hidden when data.poseScore is undefined
  analyze/VideoPlayer.tsx   — center panel: real <video> element when videoUrl prop provided; falls back to static cricket pitch SVG + skeleton overlay; scrubber wired to timeupdate event
  analyze/ShotAnalysis.tsx  — right panel: AI Verdict → Shot Summary → AI Voice mic → Download; download triggers blob fetch when videoUrl is present
```

Shared TypeScript interfaces live in `src/lib/types.ts` (`UploadRecord`, `ShotAnalysisData`, `KeyPoint`, `PhaseScores`).

`ShotAnalysisData` shape (all optional ML fields absent in mock data, present in real backend response):
```ts
{
  shotType: string;
  battingHand: "Right Handed" | "Left Handed";
  confidence: number;       // 0–100
  side: string;
  verdict: string;
  verdictDetail: string;
  keyPoints: KeyPoint[];    // rendered as warn/pass items; [!] prefix → warn, [OK] → pass
  shotSummary: string;      // 3-sentence Claude coaching summary
  // optional ML metrics — only present when real backend data is returned:
  quality?: string;         // "Correct" | "Average" | "Incorrect"
  poseScore?: number;       // 0–100
  similarity?: number;      // 0–100
  ruleScore?: number;       // 0–100
  phaseScores?: PhaseScores;
  impactDetected?: boolean;
  impactConfidence?: number;
  f1Score?: number | null;
}
```

There are no Next.js API routes under `src/app/api/` — all backend calls go directly to `:8000`.

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
- **Upload page layout**: `DropZone` fills remaining space (`flex-1`); `HowItWorks` sits beside it at `w-[300px] shrink-0 self-start max-h-full overflow-y-auto` — `self-start` prevents height-stretching; `max-h-full overflow-y-auto` prevents clipping when content is tall.
- **Analyze button flow**: `DropZone` health-checks `GET :8000/health` (4 s timeout) before uploading. On failure it shows an inline error and aborts. On success it POSTs `FormData` to `:8000/analyze`, stores the JSON response in `sessionStorage` under the key `"shotResult"`, then navigates to `/analyze`. The FormData POST has **no timeout** — large videos can hang indefinitely if the backend stalls.
- **Mock data fallback**: `MOCK_DATA` in `analyze/page.tsx` is used only when the page is visited directly (no `sessionStorage` key). Malformed JSON in `sessionStorage["shotResult"]` also silently falls back to MOCK_DATA with no error shown to the user. Do not remove MOCK_DATA — it keeps the route renderable in isolation.
- **Borders**: use `border-[rgba(255,255,255,0.07)]` inline rather than a utility class, since the value sits below Tailwind's opacity-modifier threshold. This pattern is used consistently across all panels and table rows.
- **One-off accent colors**: the AI Verdict box in `ShotAnalysis` uses `bg-[rgba(34,197,94,0.06)]` (green tint) — an intentional deviation from the brand palette; don't replicate this pattern elsewhere without reason.
- **AI Voice section**: placeholder for the Kabuni voice API integration — the mic button toggles `listening` state only; no actual voice processing is wired.
