import CircularProgress from "@/components/ui/CircularProgress";
import type { ShotAnalysisData } from "@/lib/types";

interface ShotMetricsProps {
  data: ShotAnalysisData;
}

const QUALITY_COLOR: Record<string, string> = {
  Correct:   "text-[#32cd32]",
  Average:   "text-[#00bfff]",
  Incorrect: "text-[#6464dc]",
};

function ScoreBar({ label, value }: { label: string; value?: number }) {
  const pct = value ?? 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[10px] text-muted">{label}</span>
        <span className="font-machina text-[10px] font-[800] tabular-nums text-foreground">
          {pct}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PhaseBar({ label, value }: { label: string; value?: number }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 font-sans text-[9px] text-muted">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-[rgba(232,214,0,0.5)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-machina text-[9px] font-[800] tabular-nums text-muted">
        {pct}
      </span>
    </div>
  );
}

export default function ShotMetrics({ data }: ShotMetricsProps) {
  const hasExtra = data.quality !== undefined;

  return (
    <aside className="flex h-full w-[200px] shrink-0 flex-col gap-2 rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-3">
      <h2 className="font-machina text-xs font-[800] uppercase tracking-widest text-muted">
        Shot Metrics
      </h2>

      {/* Confidence Score */}
      <div className="mt-1 flex flex-col items-center gap-1.5">
        <span className="self-start font-sans text-xs text-muted">Confidence</span>
        <CircularProgress value={data.confidence} size={90} strokeWidth={7} />
      </div>

      {hasExtra && (
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-px bg-[rgba(255,255,255,0.06)]" />

          {/* Quality */}
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-muted">Quality</span>
            <span className={`font-machina text-xs font-[800] ${QUALITY_COLOR[data.quality!] ?? "text-foreground"}`}>
              {data.quality}
            </span>
          </div>

          {/* Score bars */}
          <div className="flex flex-col gap-1.5">
            <ScoreBar label="Pose Score"  value={data.poseScore} />
            <ScoreBar label="Similarity"  value={data.similarity} />
            <ScoreBar label="Rule Score"  value={data.ruleScore} />
          </div>

          <div className="h-px bg-[rgba(255,255,255,0.06)]" />

          {/* Phase scores */}
          <div className="flex flex-col gap-1">
            <span className="font-sans text-xs text-muted">Phase Scores</span>
            <PhaseBar label="Backswing"      value={data.phaseScores?.backswing} />
            <PhaseBar label="Impact"         value={data.phaseScores?.impact} />
            <PhaseBar label="Follow-through" value={data.phaseScores?.followThrough} />
          </div>

          {/* Impact + F1 */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="h-px bg-[rgba(255,255,255,0.06)]" />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-sans text-[10px] text-muted">Impact</span>
                <span className={`font-machina text-[11px] font-[800] ${data.impactDetected ? "text-[#32cd32]" : "text-[#c88c3c]"}`}>
                  {data.impactDetected ? `YES · ${data.impactConfidence}%` : "NO · fallback"}
                </span>
              </div>
              {data.f1Score != null && (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-sans text-[10px] text-muted">Model F1</span>
                  <span className="font-machina text-[11px] font-[800] text-foreground">
                    {Math.round(data.f1Score * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
