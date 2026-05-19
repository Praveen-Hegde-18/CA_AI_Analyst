"use client";

import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import clsx from "clsx";
import type { ShotAnalysisData } from "@/lib/types";

interface ShotAnalysisProps {
  data: ShotAnalysisData;
  videoUrl?: string;
}

export default function ShotAnalysis({ data }: ShotAnalysisProps) {
  const [listening, setListening] = useState(false);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col gap-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-4">
      <h2 className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
        Shot Analysis
      </h2>

      {/* Shot Type — replaces AI Verdict */}
      <section className="flex flex-col gap-1.5">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          Shot Type
        </span>
        <div className="flex items-center gap-2 rounded-lg border border-[rgba(232,214,0,0.18)] bg-[rgba(232,214,0,0.06)] px-2.5 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[rgba(232,214,0,0.25)] bg-[rgba(232,214,0,0.1)]">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 13L9 4l3 2-6 9-3-2z" stroke="#E8D600" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="12" cy="3.5" r="1.5" fill="#E8D600" opacity="0.7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-machina text-xs font-[800] leading-tight text-brand">
              {data.shotType}
            </p>
          </div>
        </div>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Shot Summary */}
      <section className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          Summary
        </span>
        <p className="font-sans text-xs leading-relaxed text-foreground">
          {data.shotSummary ?? ""}
        </p>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* AI Voice */}
      <section className="mt-4 flex flex-col gap-2">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          AI Voice
        </span>
        <div className="flex flex-col items-center gap-2 pt-1">
          <p className="text-center font-sans text-[11px] leading-relaxed text-muted">
            Ask anything about this shot or technique.
          </p>
          <button
            onClick={() => setListening((p) => !p)}
            aria-label={listening ? "Stop listening" : "Ask AI"}
            className={clsx(
              "relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200",
              listening
                ? "bg-brand shadow-[0_0_0_6px_rgba(232,214,0,0.15),0_0_0_12px_rgba(232,214,0,0.06)]"
                : "bg-brand hover:bg-brand-hover hover:shadow-[0_0_0_6px_rgba(232,214,0,0.12)]"
            )}
          >
            {listening
              ? <MicOff size={18} className="text-background" />
              : <Mic size={18} className="text-background" />}
            {listening && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-20" />
            )}
          </button>
          <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
            {listening ? "Listening…" : "Tap to Ask"}
          </span>
        </div>
      </section>
    </aside>
  );
}
