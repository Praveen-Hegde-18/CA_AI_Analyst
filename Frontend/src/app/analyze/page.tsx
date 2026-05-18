"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
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
  const [analysisData, setAnalysisData] = useState<ShotAnalysisData>(MOCK_DATA);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("shotResult");
    if (raw) {
      try {
        const { analysisData: data, videoUrl: url } = JSON.parse(raw);
        if (data) setAnalysisData(data);
        if (url) setVideoUrl(url);
      } catch {
        // malformed storage — fall back to mock
      }
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-8 py-5">
          <h1 className="font-frama text-2xl font-black text-foreground">
            Analyze Video
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.1)] px-4 py-2 font-machina text-xs font-[800] text-muted transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-foreground"
          >
            <Upload size={13} />
            Upload Video
          </Link>
        </header>

        {/* Three-panel layout */}
        <div className="relative flex flex-1 gap-4 overflow-hidden p-6">
          <ShotMetrics data={analysisData} />
          <VideoPlayer shotType={analysisData.shotType} side={analysisData.side} videoUrl={videoUrl ?? undefined} />
          <ShotAnalysis data={analysisData} videoUrl={videoUrl ?? undefined} />
        </div>
      </main>
    </div>
  );
}
