"use client";

import { useState } from "react";
import { Play, Pause, Volume2, Maximize2 } from "lucide-react";

const SKELETON_POINTS = [
  { x: "50%", y: "14%" },
  { x: "50%", y: "28%" },
  { x: "38%", y: "30%" },
  { x: "62%", y: "30%" },
  { x: "34%", y: "44%" },
  { x: "68%", y: "42%" },
  { x: "30%", y: "56%" },
  { x: "72%", y: "52%" },
  { x: "48%", y: "52%" },
  { x: "54%", y: "52%" },
  { x: "44%", y: "68%" },
  { x: "56%", y: "68%" },
  { x: "42%", y: "84%" },
  { x: "58%", y: "82%" },
];

const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7],
  [1, 8], [1, 9], [8, 10], [9, 11], [10, 12], [11, 13],
];

interface VideoPlayerProps {
  shotType: string;
  side: string;
}

export default function VideoPlayer({ shotType, side }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress] = useState(33);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface">
      {/* Video viewport */}
      <div className="relative aspect-video w-full bg-[#0d0d0d]">
        <div className="absolute inset-0">
          <div className="relative h-full w-full">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a2a1a] via-[#0f1a0f] to-[#0a0a0a] opacity-80" />
            <svg
              className="absolute inset-0 h-full w-full opacity-10"
              viewBox="0 0 640 360"
              preserveAspectRatio="none"
            >
              <ellipse cx="320" cy="300" rx="280" ry="80" stroke="#4ade80" strokeWidth="1" fill="none" />
              <line x1="320" y1="0" x2="320" y2="360" stroke="#4ade80" strokeWidth="0.5" />
            </svg>

            {/* Skeleton lines */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {SKELETON_CONNECTIONS.map(([a, b]) => {
                const pa = SKELETON_POINTS[a];
                const pb = SKELETON_POINTS[b];
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={parseFloat(pa.x)}
                    y1={parseFloat(pa.y)}
                    x2={parseFloat(pb.x)}
                    y2={parseFloat(pb.y)}
                    stroke="rgba(74,222,128,0.55)"
                    strokeWidth="0.6"
                  />
                );
              })}
            </svg>

            {/* Skeleton dots */}
            {SKELETON_POINTS.map((pt, i) => (
              <div
                key={i}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(74,222,128,0.8)] bg-[rgba(74,222,128,0.25)] shadow-[0_0_6px_rgba(74,222,128,0.5)]"
                style={{ left: pt.x, top: pt.y }}
              />
            ))}
          </div>
        </div>

        {/* Shot label — top left */}
        <div className="absolute left-3 top-3 rounded-lg border border-[rgba(232,214,0,0.3)] bg-[rgba(10,10,10,0.85)] px-3 py-1.5 backdrop-blur-sm">
          <p className="font-machina text-xs font-[800] uppercase tracking-widest text-brand">
            {shotType}
          </p>
          <p className="font-sans text-[10px] text-muted">{side}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 border-t border-[rgba(255,255,255,0.07)] px-4 py-3">
        {/* Scrubber */}
        <div className="flex items-center gap-3">
          <span className="w-12 font-machina text-[11px] font-[800] tabular-nums text-muted">
            00:02
          </span>
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-12 text-right font-machina text-[11px] font-[800] tabular-nums text-muted">
            00:06
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] text-foreground transition-colors hover:border-brand hover:text-brand"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying
              ? <Pause size={14} />
              : <Play size={14} className="translate-x-0.5" />}
          </button>

          <div className="flex items-center gap-2">
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground">
              <Volume2 size={14} />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
