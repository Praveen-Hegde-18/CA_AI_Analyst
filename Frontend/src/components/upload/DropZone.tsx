"use client";

import { useCallback, useRef, useState } from "react";
import { CloudUpload, FolderOpen, Loader2, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024;

function isValidFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: "Only MP4, MOV, and AVI formats are supported." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: "File exceeds the 5 GB size limit." };
  }
  return { valid: true };
}

export default function DropZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFile = useCallback((file: File) => {
    const result = isValidFile(file);
    if (!result.valid) {
      setError(result.error ?? "Invalid file.");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onAnalyze = useCallback(async () => {
    if (!selectedFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      // Pre-flight: confirm backend is reachable before uploading
      try {
        const healthController = new AbortController();
        const healthTimer = setTimeout(() => healthController.abort(), 4000);
        await fetch("http://localhost:8000/health", { signal: healthController.signal });
        clearTimeout(healthTimer);
      } catch {
        setError("Cannot reach the analysis server on port 8000. Make sure the backend is running.");
        setIsAnalyzing(false);
        return;
      }

      const formData = new FormData();
      formData.append("video", selectedFile);

      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 422) {
          setError("Pose detection failed — ensure the video shows a single-ball delivery with a clearly visible batter.");
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body?.detail ?? `Analysis failed (status ${res.status}). Check the backend logs.`);
        }
        setIsAnalyzing(false);
        return;
      }

      const json = await res.json();
      sessionStorage.setItem("shotResult", JSON.stringify(json));
      router.push("/analyze");
    } catch {
      setError("Network error — the connection was lost during upload. Please try again.");
      setIsAnalyzing(false);
    }
  }, [selectedFile, isAnalyzing, router]);

  return (
    <div className="flex min-w-0 flex-1 self-stretch flex-col gap-4">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          "relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-8 text-center transition-colors duration-200",
          isDragging
            ? "border-brand bg-[rgba(232,214,0,0.04)]"
            : "border-[rgba(255,255,255,0.12)] bg-surface hover:border-[rgba(232,214,0,0.4)]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
          className="sr-only"
          onChange={onInputChange}
          aria-label="Upload video file"
        />

        <div
          className={clsx(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-full border transition-colors",
            isDragging
              ? "border-brand bg-[rgba(232,214,0,0.1)]"
              : "border-[rgba(255,255,255,0.1)] bg-surface-2"
          )}
        >
          <CloudUpload
            size={28}
            className={clsx(isDragging ? "text-brand" : "text-muted")}
          />
        </div>

        {selectedFile ? (
          <div className="flex w-full flex-col items-center gap-1">
            <p className="w-full truncate text-center font-machina text-sm font-[800] text-foreground">
              {selectedFile.name}
            </p>
            <p className="font-sans text-xs text-muted">
              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB — ready to upload
            </p>
          </div>
        ) : (
          <>
            <p className="font-frama text-lg font-black text-foreground">
              Drag &amp; drop your video here
            </p>
            <p className="mt-1 font-sans text-sm text-muted">or</p>
          </>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 font-machina text-sm font-[800] text-background transition-colors hover:bg-brand-hover active:scale-[0.98]"
        >
          <FolderOpen size={15} />
          Browse Files
        </button>

        {error && (
          <p className="mt-3 font-sans text-xs text-red-400">{error}</p>
        )}

        <p className="mt-5 font-sans text-xs text-muted">
          Supported formats: MP4, MOV, AVI&nbsp;&nbsp;•&nbsp;&nbsp;Max size: 5GB
        </p>
      </div>

      {/* Analyze button */}
      <button
        type="button"
        onClick={onAnalyze}
        disabled={!selectedFile || isAnalyzing}
        className={clsx(
          "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 font-machina text-sm font-[800] uppercase tracking-wide transition-all duration-200",
          selectedFile && !isAnalyzing
            ? "bg-brand text-background hover:bg-brand-hover active:scale-[0.99] cursor-pointer"
            : "cursor-not-allowed bg-[rgba(255,255,255,0.05)] text-muted"
        )}
      >
        {isAnalyzing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <ScanLine size={16} />
            Analyze Video
          </>
        )}
      </button>
    </div>
  );
}
