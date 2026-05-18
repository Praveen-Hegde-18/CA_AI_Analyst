"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Maximize2, Minimize2, ArrowLeft } from "lucide-react";

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

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface VideoPlayerProps {
  shotType: string;
  side: string;
  videoUrl?: string;
}

export default function VideoPlayer({ shotType, side, videoUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync play/pause state with the video element
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate",     onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play",           onPlay);
    video.addEventListener("pause",          onPause);
    video.addEventListener("ended",          onEnded);
    return () => {
      video.removeEventListener("timeupdate",     onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("ended",          onEnded);
    };
  }, [videoUrl]);

  const onScrubberClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * video.duration;
  }, []);

  const hasVideo = Boolean(videoUrl);

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface ${isExpanded ? "absolute inset-0 z-50" : "h-full flex-1"}`}>
      {/* Video viewport */}
      <div className={`relative w-full bg-[#0d0d0d] ${isExpanded ? "min-h-0 flex-1" : "aspect-video"}`}>
        {hasVideo ? (
          /* Real annotated video from backend */
          <video
            ref={videoRef}
            src={`http://localhost:8000${videoUrl}`}
            className="absolute inset-0 h-full w-full object-contain"
            playsInline
          />
        ) : (
          /* Static placeholder — skeleton + pitch SVG */
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

        {/* Back arrow — expanded only */}
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.3)] bg-[rgba(10,10,10,0.9)] text-foreground backdrop-blur-sm transition-colors hover:border-brand hover:text-brand"
            aria-label="Minimize"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-[rgba(255,255,255,0.07)] px-4 py-3">
        {/* Scrubber */}
        <div className="flex items-center gap-3">
          <span className="w-12 font-machina text-[11px] font-[800] tabular-nums text-muted">
            {formatTime(currentTime)}
          </span>
          <div
            className="relative h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]"
            onClick={onScrubberClick}
          >
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-12 text-right font-machina text-[11px] font-[800] tabular-nums text-muted">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={hasVideo ? togglePlay : undefined}
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
            <button
              onClick={() => setIsExpanded((e) => !e)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground"
              aria-label={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
