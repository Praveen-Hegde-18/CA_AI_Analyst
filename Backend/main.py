"""
FastAPI backend for Kabuni Cricket AI.

Endpoints:
    GET  /health             → health check
    POST /analyze            → multipart video upload → ShotAnalysisData JSON + videoUrl
    GET  /video/{filename}   → serve annotated MP4
"""

import os
import tempfile
import uuid
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")  # loads d:\CA_POC\.env

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import inference

app = FastAPI(title="Kabuni Cricket AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PROCESSED_DIR = Path(__file__).parent / "processed"
PROCESSED_DIR.mkdir(exist_ok=True)

SIDE_LOOKUP = {
    "Cover Drive":     "Off Side",
    "Cut":             "Off Side",
    "Pull":            "Leg Side",
    "Sweep":           "Leg Side",
    "Flick":           "Leg Side",
    "Forward Defence": "Straight",
}


def _parse_keypoints(feedback: list[str]) -> list[dict]:
    out = []
    for tip in feedback:
        if tip.startswith("[!]"):
            out.append({"text": tip[3:].strip(), "type": "warn"})
        elif tip.startswith("[OK]"):
            out.append({"text": tip[4:].strip(), "type": "pass"})
        else:
            out.append({"text": tip.strip(), "type": "pass"})
    return out


def _build_response(result: dict, video_filename: str) -> dict:
    shot      = result["shot"]
    conf      = result["confidence"]
    pose      = result["pose"]
    quality   = pose["quality"]
    score     = pose["score"]
    phases    = pose.get("phase_scores", {})
    sim       = pose["similarity"]
    rule_sc   = pose["rule_score"]

    verdict_map = {"Correct": "Good", "Average": "Average", "Incorrect": "Poor"}
    verdict_prefix = verdict_map.get(quality, "")
    verdict = f"{verdict_prefix} {shot}".strip() if shot != "Not Identified" else "Not Identified"

    verdict_detail = (
        f"Pose score: {round(score * 100)}% — technique looks solid."
        if quality == "Correct"
        else f"Pose score: {round(score * 100)}% — room for improvement."
        if quality == "Average"
        else f"Pose score: {round(score * 100)}% — significant technique issues detected."
    )

    return {
        "analysisData": {
            "shotType":         shot,
            "battingHand":      result.get("batting_hand", "Right Handed"),
            "confidence":       round(conf * 100),
            "side":             SIDE_LOOKUP.get(shot, "Unknown"),
            "verdict":          verdict,
            "verdictDetail":    verdict_detail,
            "keyPoints":        _parse_keypoints(result.get("feedback", [])),
            "shotSummary":      result.get("llm_summary", ""),
            # ML pipeline metrics (optional fields)
            "quality":          quality,
            "poseScore":        round(score * 100),
            "similarity":       round(sim * 100),
            "ruleScore":        round(rule_sc * 100),
            "phaseScores": {
                "backswing":    round(phases.get("backswing", 0) * 100),
                "impact":       round(phases.get("impact", 0) * 100),
                "followThrough": round(phases.get("follow_through", 0) * 100),
            },
            "impactDetected":   result.get("impact_detected", False),
            "impactConfidence": round(result.get("impact_confidence", 0) * 100),
            "f1Score":          result.get("f1_score"),
        },
        "videoUrl": f"/video/{video_filename}",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(video: UploadFile = File(...)):
    suffix = Path(video.filename or "upload.mp4").suffix or ".mp4"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    try:
        out_filename = f"output_{uuid.uuid4().hex}.mp4"
        out_path     = str(PROCESSED_DIR / out_filename)

        result = inference.run_inference(tmp_path, out_path)
    finally:
        os.unlink(tmp_path)

    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Pose detection failed — ensure the video shows a single-ball delivery with a clearly visible batter.",
        )

    return _build_response(result, out_filename)


@app.get("/video/{filename}")
def serve_video(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    path = PROCESSED_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not found.")
    return FileResponse(str(path), media_type="video/mp4")
