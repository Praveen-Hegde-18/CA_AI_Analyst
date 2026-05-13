"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  CheckCircle,
  Mic,
  MicOff,
  Download,
} from "lucide-react";
import clsx from "clsx";
import type { ShotAnalysisData } from "@/lib/types";

const WAVEFORM_HEIGHTS = [3, 5, 8, 6, 10, 7, 4, 9, 6, 5, 8, 11, 7, 4, 6, 9, 5, 8, 6, 4, 7, 5, 9, 6, 4, 7, 5, 3];

interface ShotAnalysisProps {
  data: ShotAnalysisData;
}

export default function ShotAnalysis({ data }: ShotAnalysisProps) {
  const [voicePlaying, setVoicePlaying] = useState(false);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col gap-5 overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-5">
      <h2 className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
        Shot Analysis
      </h2>

      {/* AI Verdict */}
      <section className="flex flex-col gap-2">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          AI Verdict
        </span>
        <div className="flex items-start gap-2.5 rounded-lg border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.06)] p-3">
          <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-machina text-sm font-[800] text-brand">
              {data.verdict}
            </p>
            <p className="mt-1 font-sans text-xs leading-relaxed text-muted">
              {data.verdictDetail}
            </p>
          </div>
        </div>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Key Points */}
      <section className="flex flex-col gap-2">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          Key Points
        </span>
        <ul className="flex flex-col gap-2">
          {data.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5">
              {point.type === "pass" ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
              )}
              <span className="font-machina text-xs font-[400] leading-relaxed text-foreground">
                {point.text}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Voice Feedback */}
      <section className="flex flex-col gap-3">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          Voice Feedback
        </span>

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <button
            onClick={() => setVoicePlaying((p) => !p)}
            aria-label={voicePlaying ? "Stop voice feedback" : "Play voice feedback"}
            className={clsx(
              "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200",
              voicePlaying
                ? "bg-brand shadow-[0_0_0_6px_rgba(232,214,0,0.15),0_0_0_12px_rgba(232,214,0,0.06)]"
                : "bg-brand hover:bg-brand-hover hover:shadow-[0_0_0_6px_rgba(232,214,0,0.12)]"
            )}
          >
            {voicePlaying
              ? <MicOff size={22} className="text-background" />
              : <Mic size={22} className="text-background" />}
            {voicePlaying && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-20" />
            )}
          </button>

          {/* Waveform + timestamp */}
          <div className="flex w-full items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-surface-2 px-3 py-2">
            <div className="flex flex-1 items-center gap-0.5">
              {WAVEFORM_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={clsx(
                    "w-0.5 rounded-full transition-colors",
                    voicePlaying ? "bg-brand" : "bg-[rgba(255,255,255,0.2)]"
                  )}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="font-machina text-[10px] font-[800] tabular-nums text-muted">
              00:00 / {data.voiceDuration}
            </span>
          </div>
        </div>
      </section>

      {/* Download */}
      <div className="mt-auto">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-machina text-sm font-[800] text-background transition-colors hover:bg-brand-hover active:scale-[0.98]">
          <Download size={15} />
          Download Analysis
        </button>
      </div>
    </aside>
  );
}
