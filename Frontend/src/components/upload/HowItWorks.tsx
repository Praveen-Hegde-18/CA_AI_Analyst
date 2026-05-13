import { Upload, ScanLine, FileText, Download } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Upload Video",
    description: "Upload your cricket match video in supported format.",
  },
  {
    icon: ScanLine,
    title: "AI Analysis",
    description: "Our AI will analyze each shot, movement and performance metrics.",
  },
  {
    icon: FileText,
    title: "Get Insights",
    description: "Receive detailed shot analysis, metrics and AI-powered feedback.",
  },
  {
    icon: Download,
    title: "Save & Export",
    description: "Save your analysis and export reports for sharing.",
  },
];

export default function HowItWorks() {
  return (
    <div className="w-[300px] shrink-0 self-start rounded-xl border border-[rgba(255,255,255,0.07)] bg-surface p-6">
      <h2 className="font-machina text-xs font-[800] uppercase tracking-widest text-muted">
        How it works
      </h2>

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
