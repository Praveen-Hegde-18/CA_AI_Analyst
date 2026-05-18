import CircularProgress from "@/components/ui/CircularProgress";
import type { ShotAnalysisData } from "@/lib/types";

interface ShotMetricsProps {
  data: ShotAnalysisData;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[10px] text-muted">{label}</span>
        <span className="font-machina text-[10px] font-[800] tabular-nums text-foreground">{value}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

const QUALITY_STYLES: Record<string, string> = {
  Correct:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Average:   "border-sky-500/30 bg-sky-500/10 text-sky-400",
  Incorrect: "border-purple-500/30 bg-purple-500/10 text-purple-400",
};

export default function ShotMetrics({ data }: ShotMetricsProps) {
  const hasMLData = data.poseScore !== undefined;

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col gap-5 overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-5">
      <h2 className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
        Shot Metrics
      </h2>

      {/* Shot Type */}
      <div className="flex flex-col gap-2">
        <span className="font-sans text-xs text-muted">Shot Type</span>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(232,214,0,0.2)] bg-[rgba(232,214,0,0.07)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 13L9 4l3 2-6 9-3-2z"
                stroke="#E8D600"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="3.5" r="1.5" fill="#E8D600" opacity="0.6" />
            </svg>
          </div>
          <span className="font-machina text-sm font-[800] text-brand">
            {data.shotType}
          </span>
        </div>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Batting Hand */}
      <div className="flex flex-col gap-2">
        <span className="font-sans text-xs text-muted">Batting Hand</span>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] bg-surface-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="2.5" r="1.5" fill="#ededed" opacity="0.7" />
              <path d="M4 6c0-1.1.9-2 3-2s3 .9 3 2v3H4V6z" fill="#ededed" opacity="0.5" />
              <path d="M5 9v3.5M9 9v3.5" stroke="#ededed" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <span className="font-machina text-sm font-[800] text-foreground">
            {data.battingHand}
          </span>
        </div>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Confidence Score */}
      <div className="flex flex-col items-center gap-3">
        <span className="self-start font-sans text-xs text-muted">Confidence Score</span>
        <CircularProgress value={data.confidence} size={100} strokeWidth={7} />
      </div>

      {/* ML pipeline metrics — only shown when real backend data is present */}
      {hasMLData && (
        <>
          <div className="h-px bg-[rgba(255,255,255,0.06)]" />

          <div className="flex flex-col gap-4">
            {/* Quality badge */}
            {data.quality && (
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-muted">Quality</span>
                <span
                  className={`rounded-md border px-2 py-0.5 font-machina text-[10px] font-[800] ${QUALITY_STYLES[data.quality] ?? "border-[rgba(255,255,255,0.1)] text-muted"}`}
                >
                  {data.quality}
                </span>
              </div>
            )}

            {/* Score bars */}
            {data.poseScore !== undefined && (
              <ScoreBar label="Pose Score" value={data.poseScore} />
            )}
            {data.similarity !== undefined && (
              <ScoreBar label="Similarity" value={data.similarity} />
            )}
            {data.ruleScore !== undefined && (
              <ScoreBar label="Rule Score" value={data.ruleScore} />
            )}

            {/* Phase scores */}
            {data.phaseScores && (
              <div className="flex flex-col gap-2">
                <span className="font-sans text-[10px] text-muted">Phase Scores</span>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      ["Backswing",      data.phaseScores.backswing],
                      ["Impact",         data.phaseScores.impact],
                      ["Follow-through", data.phaseScores.followThrough],
                    ] as [string, number][]
                  ).map(([label, val]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-[82px] shrink-0 font-sans text-[10px] text-muted">{label}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <div
                          className="h-full rounded-full bg-[rgba(232,214,0,0.6)]"
                          style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                        />
                      </div>
                      <span className="w-7 text-right font-machina text-[10px] font-[800] tabular-nums text-muted">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Impact detection */}
            {data.impactDetected !== undefined && (
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-muted">Impact</span>
                <span
                  className={`font-machina text-[10px] font-[800] ${data.impactDetected ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {data.impactDetected
                    ? `YES (${data.impactConfidence ?? 0}%)`
                    : "NO (velocity fallback)"}
                </span>
              </div>
            )}

            {/* Model F1 */}
            {data.f1Score != null && (
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-muted">Model F1</span>
                <span className="font-machina text-[10px] font-[800] text-foreground tabular-nums">
                  {data.f1Score.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
