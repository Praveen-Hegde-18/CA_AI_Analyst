"use client";

import { useState } from "react";
import DropZone from "@/components/upload/DropZone";
import HowItWorks from "@/components/upload/HowItWorks";
import { Info } from "lucide-react";

export default function UploadPage() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <main className="flex flex-1 flex-col overflow-hidden" style={{ zoom: 1.1 }}>
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-8 py-4">
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
          <button
            onClick={() => setShowInfo((p) => !p)}
            aria-label="How it works"
            title="How it works"
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
              showInfo
                ? "border-brand text-brand"
                : "border-[rgba(255,255,255,0.12)] text-muted hover:border-brand hover:text-brand"
            }`}
          >
            <Info size={15} />
          </button>
        </header>

        {/* Body */}
        <div className="flex flex-1 gap-6 overflow-hidden p-8">
          <DropZone />
          {showInfo && <HowItWorks />}
        </div>
      </main>
    </div>
  );
}
