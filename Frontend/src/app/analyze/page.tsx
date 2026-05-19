"use client";

import { useEffect, useState } from "react";
import ShotMetrics from "@/components/analyze/ShotMetrics";
import VideoPlayer from "@/components/analyze/VideoPlayer";
import ShotAnalysis from "@/components/analyze/ShotAnalysis";
import type { ShotAnalysisData } from "@/lib/types";
import { Upload } from "lucide-react";
import Link from "next/link";

const MOCK_DATA: ShotAnalysisData = {
  shotType: "Cover Drive",
  battingHand: "Right Handed",
  confidence: 92,
  side: "Off Side",
  verdict: "Good Cover Drive",
  verdictDetail: "Well executed shot with good timing and balance.",
  keyPoints: [
    { text: "Stable head position", type: "pass" },
    { text: "Good front foot movement", type: "pass" },
    { text: "Bat path was on line", type: "pass" },
    { text: "Slightly closed stance limited extension", type: "warn" },
  ],
  shotSummary:
    "The batsman played a Cover Drive with 92% confidence. An elegant front-foot off-side shot executed with a stable head position and good foot movement. The bat path tracked the line of the ball cleanly through the off side. A slightly closed stance reduced full arm extension at follow-through, which could be improved for maximum power and control.",
};

export default function AnalyzePage() {
  const [data, setData] = useState<ShotAnalysisData>(MOCK_DATA);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const raw = sessionStorage.getItem("shotResult");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.analysisData) setData(parsed.analysisData);
      if (parsed.videoUrl) setVideoUrl(parsed.videoUrl);
    } catch {
      // malformed storage — fall through to mock data
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kabuni-k.png" alt="Kabuni" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="font-frama text-xl font-black leading-tight text-brand">
                Kabuni Shot Analysis
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-sans text-[10px] text-foreground">powered by</span>
                <span className="inline-flex items-center rounded-sm border border-[rgba(255,255,255,0.35)] px-1.5 py-0.5 font-machina text-[10px] font-[800] uppercase tracking-wider text-foreground">
                  Cricket Australia
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.1)] px-4 py-2 font-machina text-xs font-[800] text-muted transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-foreground"
          >
            <Upload size={13} />
            Upload Video
          </Link>
        </header>

        {/* Three-panel layout */}
        <div className="relative flex flex-1 min-h-0 gap-3 overflow-hidden p-4">
          <ShotMetrics data={data} />
          <VideoPlayer shotType={data.shotType} videoUrl={videoUrl} />
          <ShotAnalysis data={data} videoUrl={videoUrl} />
        </div>
      </main>
    </div>
  );
}
