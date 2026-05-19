import { Upload, ScanLine, FileText, Download, AlertCircle } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload One Ball Clip",
    description: "Single delivery only — bowler release to batsman shot.",
  },
  {
    icon: ScanLine,
    title: "AI Analysis",
    description: "AI analyses shot, body pose, and technique.",
  },
  {
    icon: FileText,
    title: "Get Insights",
    description: "Shot summary, technique breakdown, and coaching feedback.",
  },
  {
    icon: Download,
    title: "Download",
    description: "Download the annotated video",
 
  },
];

export default function HowItWorks() {
  return (
    <div className="w-[260px] shrink-0 self-start rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-4">
      <h2 className="font-machina text-[10px] font-[800] uppercase tracking-widest text-muted">
        How it works
      </h2>

      {/* Important notice */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[rgba(232,214,0,0.2)] bg-[rgba(232,214,0,0.06)] px-2.5 py-2">
        <AlertCircle size={12} className="mt-0.5 shrink-0 text-brand" />
        <p className="font-sans text-[10px] leading-snug text-brand">
          <strong>One ball only</strong> — single delivery clip. Full overs will not work.
        </p>
      </div>

      <ol className="mt-3 flex flex-col gap-3">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="flex items-start gap-3">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(232,214,0,0.2)] bg-[rgba(232,214,0,0.06)]">
              <Icon size={13} className="text-brand" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand font-sans text-[8px] font-bold text-background">
                {index + 1}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-machina text-xs font-[800] text-foreground">
                {title}
              </p>
              <p className="font-sans text-[10px] leading-snug text-muted">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
