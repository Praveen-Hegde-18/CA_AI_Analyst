"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, Volume2, Maximize2, Minimize2, ArrowLeft, Download, Loader2 } from "lucide-react";

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
  videoUrl?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ shotType, videoUrl }: VideoPlayerProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration]     = useState("00:00");
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleDownload = async () => {
    if (!videoUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:8000${videoUrl}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cricket_analysis_${shotType.replace(/\s+/g, "_")}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      if (v.duration) {
        setProgress((v.currentTime / v.duration) * 100);
        setCurrentTime(formatTime(v.currentTime));
      }
    };
    const onLoaded    = () => setDuration(formatTime(v.duration));
    const onEnded     = () => setIsPlaying(false);

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const videoViewport = (expanded: boolean) => (
    <div className="relative min-h-0 flex-1 w-full bg-[#0d0d0d]">
      {videoUrl ? (
        <video
          ref={expanded === isExpanded ? videoRef : undefined}
          src={`http://localhost:8000${videoUrl}`}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
        />
      ) : (
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
            {SKELETON_POINTS.map((pt, i) => (
              <div
                key={i}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(74,222,128,0.8)] bg-[rgba(74,222,128,0.25)] shadow-[0_0_6px_rgba(74,222,128,0.5)]"
                style={{ left: pt.x, top: pt.y }}
              />
            ))}
          </div>
        </div>
      )}
      {expanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.3)] bg-[rgba(10,10,10,0.9)] text-foreground backdrop-blur-sm transition-colors hover:border-brand hover:text-brand"
          aria-label="Minimize"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );

  const controls = (expanded: boolean) => (
    <div className="flex shrink-0 items-center gap-3 border-t border-[rgba(255,255,255,0.07)] px-3 py-2">
      <button
        onClick={videoUrl ? togglePlay : () => setIsPlaying((p) => !p)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] text-foreground transition-colors hover:border-brand hover:text-brand"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} className="translate-x-0.5" />}
      </button>
      <span className="shrink-0 font-machina text-[10px] font-[800] tabular-nums text-muted">
        {videoUrl ? currentTime : "00:00"}
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-brand transition-all duration-100"
          style={{ width: `${videoUrl ? progress : 0}%` }}
        />
      </div>
      <span className="shrink-0 font-machina text-[10px] font-[800] tabular-nums text-muted">
        {videoUrl ? duration : "00:00"}
      </span>
      <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-foreground">
        <Volume2 size={13} />
      </button>
      <button
        onClick={() => setIsExpanded((e) => !e)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-foreground"
        aria-label={expanded ? "Minimize" : "Expand"}
      >
        {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Normal (non-expanded) player — always in-flow */}
      <div className="h-full flex-1 flex flex-col overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface">
        {videoViewport(false)}
        {controls(false)}
        <div className="shrink-0 border-t border-[rgba(255,255,255,0.07)] px-4 py-2.5 flex justify-end">
          <button
            onClick={handleDownload}
            disabled={!videoUrl || downloading}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand px-8 py-2 font-machina text-xs font-[800] text-background transition-colors hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {downloading ? (
              <><Loader2 size={13} className="animate-spin" />Downloading…</>
            ) : (
              <><Download size={13} />Download</>
            )}
          </button>
        </div>
      </div>

      {/* Expanded overlay — portalled to document.body to escape overflow-hidden ancestors */}
      {mounted && isExpanded && createPortal(
        <div className="fixed left-0 right-0 bottom-0 z-[9999] flex flex-col bg-surface" style={{ top: 72 }}>
          {videoViewport(true)}
          {controls(true)}
        </div>,
        document.body
      )}
    </>
  );
}
