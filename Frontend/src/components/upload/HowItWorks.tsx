import { Upload, ScanLine, FileText, Download, AlertCircle } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload One Ball Clip",
    description: "Upload a short clip of a single delivery — from the bowler's release to the batsman's shot. Do not upload a full over or match.",
  },
  {
    icon: ScanLine,
    title: "AI Analysis",
    description: "Our AI analyzes the batsman's shot, body pose, and technique for that single delivery.",
  },
  {
    icon: FileText,
    title: "Get Insights",
    description: "Receive a detailed shot summary, technique breakdown, and AI-powered coaching feedback.",
  },
  {
    icon: Download,
    title: "Save & Export",
    description: "Save your analysis and export reports for sharing.",
  },
];

export default function HowItWorks() {
  return (
    <div className="w-[300px] shrink-0 self-start max-h-full overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-6">
      <h2 className="font-machina text-xs font-[800] uppercase tracking-widest text-muted">
        How it works
      </h2>

      {/* Important notice */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-[rgba(232,214,0,0.2)] bg-[rgba(232,214,0,0.06)] px-3 py-2.5">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-brand" />
        <p className="font-sans text-[11px] leading-relaxed text-brand">
          Upload <strong>one ball only</strong> — a single delivery clip. Full overs or match videos will not work.
        </p>
      </div>

      <ol className="mt-5 flex flex-col gap-5">
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="flex items-start gap-4">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(232,214,0,0.2)] bg-[rgba(232,214,0,0.06)]">
              <Icon size={16} className="text-brand" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand font-sans text-[9px] font-bold text-background">
                {index + 1}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-machina text-sm font-[800] text-foreground">
                {title}
              </p>
              <p className="font-sans text-xs leading-relaxed text-muted">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
