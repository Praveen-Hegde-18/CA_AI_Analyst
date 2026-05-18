# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Kabuni Cricket AI** — An end-to-end AI cricket coaching POC. Users upload a single-ball clip (one delivery: bowler release → batsman shot) and receive automated shot classification, biomechanical scoring, Claude-generated coaching text, and a downloadable annotated video.

**Current state: fully wired.** The frontend, FastAPI backend, and ML inference pipeline are all connected and working. No mock data is served in production flow.

## Repository structure

```
CA_POC/
├── Frontend/               # Next.js 15 app — see Frontend/CLAUDE.md for details
├── Backend/
│   ├── inference.py        # Full ML pipeline (models loaded at import time)
│   ├── main.py             # FastAPI server — /health, /analyze, /video/{filename}
│   ├── requirements.txt    # fastapi, uvicorn[standard], python-multipart, python-dotenv
│   └── processed/          # Output annotated videos (git-ignored, created at runtime)
├── ML_layer/               # ideal_poses.npy, ideal_poses_raw.npy + training arrays
├── files/                  # Jupyter notebooks + best_model.pth (BiLSTM checkpoint)
├── impact_cls_550_data.pt  # MobileNetV2 impact detector checkpoint (root level)
├── .env                    # ANTHROPIC_API_KEY (git-ignored — never commit)
└── .venv/                  # Python virtual environment
```

## Running the full stack

Both servers must be running simultaneously. PowerShell 5.1 — use separate terminals, no `&&`.

**Terminal 1 — Backend (port 8000):**
```powershell
.venv\Scripts\Activate.ps1
cd Backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (port 3000):**
```powershell
cd Frontend
npm run dev
```

**Frontend commands** (all from `Frontend/`):
```powershell
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

**First-time backend setup:**
```powershell
.venv\Scripts\Activate.ps1
pip install fastapi "uvicorn[standard]" python-multipart python-dotenv
```

No test suite is configured yet.

## Environment

`ANTHROPIC_API_KEY` must be in `.env` at the repo root — `main.py` loads it automatically via `python-dotenv` at startup. Format:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Backend architecture

### Data flow (end-to-end)

```
Browser → POST /analyze (multipart video)
  → Backend saves to temp file
  → inference.run_inference(video_path, output_path)
      Pass 1: MediaPipe extracts pose keypoints per frame
              MobileNetV2 (impact_cls_550_data.pt) detects impact frame
              Handedness detection → mirror if left-handed (3-signal majority vote)
      Shot classifier BiLSTM (files/best_model.pth) → shot name + confidence
      Phase-aware cosine similarity vs ideal_poses (ML_layer/ideal_poses.npy)
      Biomechanical rule scoring (shot-specific per-joint rules)
      Claude claude-opus-4-7 → 3-sentence plain-text coaching summary
      Pass 2: OpenCV draws HUD overlay → H.264 MP4 → Backend/processed/
  → main.py maps result dict → ShotAnalysisData JSON
  → Returns { analysisData, videoUrl }
Browser stores in sessionStorage → navigates to /analyze
```

### inference.py

Models are loaded **once at module import time** — not per request. Key constants:

```python
ROOT = Path(__file__).parent.parent          # repo root
SHOT_MODEL_PATH  = ROOT / "files" / "best_model.pth"
IMPACT_CKPT      = ROOT / "impact_cls_550_data.pt"
IDEAL_POSES_PATH = ROOT / "ML_layer" / "ideal_poses.npy"
CONF_THRESHOLD   = 0.80   # shots below this → "Not Identified"
```

Public API: `run_inference(video_path: str, output_path: str) -> dict | None`

Returns `None` if fewer than 10 valid pose frames are detected (triggers HTTP 422).

### Handedness detection (3-signal majority vote)

`detect_handedness()` casts three ±1 votes — majority determines hand:
1. Wrist Y in first 25% of frames (stance, before swing)
2. Median wrist Y across the full clip
3. Elbow Y in the first 50% of frames

Single-metric approaches fail for shots like the Sweep where wrists cross at impact.

### main.py — data mapping

Result dict → `ShotAnalysisData` JSON:

| Inference field | Frontend field | Transform |
|---|---|---|
| `result['shot']` | `shotType` | direct |
| `result['confidence'] × 100` | `confidence` | round to int |
| `result['batting_hand']` | `battingHand` | direct |
| shot lookup table | `side` | Cover Drive/Cut → Off Side; Pull/Sweep/Flick → Leg Side; Forward Defence → Straight |
| `quality + shot` | `verdict` | e.g. "Good Cover Drive" |
| `result['llm_summary']` | `shotSummary` | direct |
| `result['feedback']` | `keyPoints` | `[!]` → warn, `[OK]` → pass |
| pose metrics | `poseScore`, `similarity`, `ruleScore`, `phaseScores`, … | pass-through as optional fields |

## ML layer

### Model files (git-ignored — not committed)

| File | Location | Description |
|---|---|---|
| `best_model.pth` | `files/` | BiLSTM shot classifier (6 classes, 214-dim input) |
| `impact_cls_550_data.pt` | repo root | MobileNetV2 impact frame detector |

### Processed data

`ML_layer/` contains the arrays used at inference time:
- `ideal_poses.npy` — ideal pose clusters (6 shots × 3 phases × 3 clusters, 214-dim features)
- `ideal_poses_raw.npy` — same clusters as raw 99-dim keypoints (used for keypoint error calc)

`ML_layer/` and `dataset/` are git-ignored (large files). The notebooks that generated them live in `files/*.ipynb`.

### Shot classes

`Cover Drive`, `Cut`, `Flick`, `Forward Defence`, `Pull`, `Sweep`

## Frontend integration

The frontend is wired — **no mock data in the normal flow**. `analyze/page.tsx` reads `sessionStorage.getItem("shotResult")` on mount and falls back to `MOCK_DATA` only when visited directly (no upload session).

Key wiring points:
- `DropZone.onAnalyze()` — health-checks `:8000/health`, then POSTs `FormData` to `:8000/analyze`, stores JSON in `sessionStorage`, navigates to `/analyze`
- `VideoPlayer` — renders a real `<video>` element when `videoUrl` prop is provided; falls back to static skeleton SVG
- `ShotMetrics` — shows ML pipeline metrics panel (quality badge, score bars, phase scores, impact detection, F1) only when `data.poseScore !== undefined`
- `ShotAnalysis` — Download button fetches the annotated video as a blob when `videoUrl` is present

See `Frontend/CLAUDE.md` for design tokens, typography rules, and component-level patterns.
