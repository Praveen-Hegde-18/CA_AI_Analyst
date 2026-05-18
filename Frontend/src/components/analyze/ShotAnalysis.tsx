"use client";

import { useState } from "react";
import {
  CheckCircle,
  Mic,
  MicOff,
  Download,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import type { ShotAnalysisData } from "@/lib/types";

interface ShotAnalysisProps {
  data: ShotAnalysisData;
  videoUrl?: string;
}

export default function ShotAnalysis({ data, videoUrl }: ShotAnalysisProps) {
  const [listening, setListening] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!videoUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:8000${videoUrl}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cricket_analysis_${data.shotType.replace(/\s+/g, "_")}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

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

      {/* Shot Summary */}
      <section className="flex flex-col gap-2">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          Shot Summary
        </span>
        <p className="font-sans text-xs leading-relaxed text-foreground">
          {data.shotSummary}
        </p>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* AI Voice — integration point for kabuni.com Ask Kabuni mic */}
      <section className="flex flex-col gap-3">
        <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
          AI Voice
        </span>
        <div className="flex flex-col items-center gap-3 pt-2">
          <p className="text-center font-sans text-[11px] leading-relaxed text-muted">
            Ask anything about this shot — technique, coaching tips, or improvements.
          </p>
          <button
            onClick={() => setListening((p) => !p)}
            aria-label={listening ? "Stop listening" : "Ask AI"}
            className={clsx(
              "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200",
              listening
                ? "bg-brand shadow-[0_0_0_6px_rgba(232,214,0,0.15),0_0_0_12px_rgba(232,214,0,0.06)]"
                : "bg-brand hover:bg-brand-hover hover:shadow-[0_0_0_6px_rgba(232,214,0,0.12)]"
            )}
          >
            {listening
              ? <MicOff size={22} className="text-background" />
              : <Mic size={22} className="text-background" />}
            {listening && (
              <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-20" />
            )}
          </button>
          <span className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
            {listening ? "Listening…" : "Tap to Ask"}
          </span>
        </div>
      </section>

      {/* Download */}
      <div className="mt-auto">
        <button
          onClick={handleDownload}
          disabled={!videoUrl || downloading}
          className={clsx(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 font-machina text-sm font-[800] transition-colors active:scale-[0.98]",
            videoUrl && !downloading
              ? "bg-brand text-background hover:bg-brand-hover cursor-pointer"
              : "cursor-not-allowed bg-[rgba(255,255,255,0.05)] text-muted"
          )}
        >
          {downloading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Downloading…
            </>
          ) : (
            <>
              <Download size={15} />
              Download
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
