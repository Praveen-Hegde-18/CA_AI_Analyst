"use client";

import { useState } from "react";
import { BarChart2, MoreVertical, Play, ArrowRight } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { UploadRecord } from "@/lib/types";

const UPLOADS: UploadRecord[] = [
  {
    id: "1",
    name: "Match_07_vs_Riders.mp4",
    size: "1.2 GB",
    uploadedAt: "May 20, 2024 • 10:30 AM",
    duration: "02:45:30",
    status: "completed",
  },
  {
    id: "2",
    name: "Semi_Final_Highlights.mp4",
    size: "890 MB",
    uploadedAt: "May 19, 2024 • 08:45 PM",
    duration: "01:58:12",
    status: "completed",
  },
  {
    id: "3",
    name: "Practice_Session_05.mp4",
    size: "640 MB",
    uploadedAt: "May 18, 2024 • 05:20 PM",
    duration: "01:05:48",
    status: "processing",
  },
];

export default function RecentUploads() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface">
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] px-6 py-4">
        <h2 className="font-machina text-sm font-[800] text-foreground">
          Recent Uploads
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)]">
              {["Video Name", "Uploaded On", "Duration", "Status", "Action"].map(
                (col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left font-machina text-[10px] font-[800] uppercase tracking-widest text-muted"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {UPLOADS.map((upload) => (
              <tr
                key={upload.id}
                className="border-b border-[rgba(255,255,255,0.04)] transition-colors last:border-0 hover:bg-surface-2"
              >
                {/* Video Name */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] bg-surface-2">
                      <Play size={14} className="translate-x-0.5 text-muted" />
                    </div>
                    <div>
                      <p className="font-machina text-sm font-[800] text-foreground">
                        {upload.name}
                      </p>
                      <p className="mt-0.5 font-sans text-xs text-muted">
                        {upload.size}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Uploaded On */}
                <td className="px-6 py-4 font-sans text-sm text-muted">
                  {upload.uploadedAt}
                </td>

                {/* Duration */}
                <td className="px-6 py-4 font-machina text-sm font-[800] text-foreground">
                  {upload.duration}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <Badge status={upload.status} />
                </td>

                {/* Action */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <Link
                      href="/analyze"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] text-muted transition-colors hover:border-[rgba(232,214,0,0.3)] hover:text-brand"
                      aria-label={`View analysis for ${upload.name}`}
                    >
                      <BarChart2 size={14} />
                    </Link>
                    <div className="relative">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.07)] text-muted transition-colors hover:border-[rgba(255,255,255,0.15)] hover:text-foreground"
                        onClick={() =>
                          setOpenMenuId(openMenuId === upload.id ? null : upload.id)
                        }
                        aria-label="More options"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {openMenuId === upload.id && (
                        <div className="absolute right-0 top-9 z-10 w-36 rounded-lg border border-[rgba(255,255,255,0.07)] bg-surface-2 py-1 shadow-xl">
                          {["Rename", "Delete"].map((item) => (
                            <button
                              key={item}
                              className="w-full px-4 py-2 text-left font-machina text-xs font-[800] text-muted hover:bg-[rgba(255,255,255,0.04)] hover:text-foreground"
                              onClick={() => setOpenMenuId(null)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.07)] px-6 py-4">
        <button className="flex items-center gap-1.5 font-machina text-xs font-[800] text-brand transition-colors hover:text-brand-hover">
          View all uploads
          <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
}
