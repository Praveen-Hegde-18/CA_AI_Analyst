import Sidebar from "@/components/layout/Sidebar";
import DropZone from "@/components/upload/DropZone";
import HowItWorks from "@/components/upload/HowItWorks";

export default function UploadPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-[rgba(255,255,255,0.07)] px-8 py-6">
          <div>
            <h1 className="font-frama text-2xl font-black text-foreground">
              Upload &amp; Analyze Video
            </h1>
            <p className="mt-1 font-sans text-sm text-muted">
              Upload a single ball clip — one delivery from bowler to batsman — and let AI analyze the shot, technique, and performance.
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 gap-6 overflow-hidden p-8">
          <DropZone />
          <HowItWorks />
        </div>
      </main>
    </div>
  );
}