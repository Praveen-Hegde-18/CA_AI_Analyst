import CircularProgress from "@/components/ui/CircularProgress";
import type { ShotAnalysisData } from "@/lib/types";

interface ShotMetricsProps {
  data: ShotAnalysisData;
}

export default function ShotMetrics({ data }: ShotMetricsProps) {
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col gap-6 rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-5">
      <h2 className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
        Shot Metrics
      </h2>

      {/* Shot Type */}
      <div className="flex flex-col gap-2">
        <span className="font-sans text-xs text-muted">Shot Type</span>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(232,214,0,0.2)] bg-[rgba(232,214,0,0.07)]">
            {/* Cricket bat icon */}
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
            {/* Figure icon */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="2.5" r="1.5" fill="#ededed" opacity="0.7" />
              <path
                d="M4 6c0-1.1.9-2 3-2s3 .9 3 2v3H4V6z"
                fill="#ededed"
                opacity="0.5"
              />
              <path
                d="M5 9v3.5M9 9v3.5"
                stroke="#ededed"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />
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
        <span className="self-start font-sans text-xs text-muted">
          Confidence Score
        </span>
        <CircularProgress value={data.confidence} size={100} strokeWidth={7} />
      </div>
    </aside>
  );
}
