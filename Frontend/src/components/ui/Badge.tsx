import clsx from "clsx";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import type { UploadStatus } from "@/lib/types";

interface BadgeProps {
  status: UploadStatus;
}

const CONFIG: Record<
  UploadStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  completed: {
    label: "Completed",
    className: "bg-[rgba(34,197,94,0.12)] text-emerald-400 border border-[rgba(34,197,94,0.2)]",
    icon: CheckCircle,
  },
  processing: {
    label: "Processing",
    className: "bg-[rgba(59,130,246,0.12)] text-blue-400 border border-[rgba(59,130,246,0.2)]",
    icon: Loader2,
  },
  failed: {
    label: "Failed",
    className: "bg-[rgba(239,68,68,0.12)] text-red-400 border border-[rgba(239,68,68,0.2)]",
    icon: XCircle,
  },
};

export default function Badge({ status }: BadgeProps) {
  const { label, className, icon: Icon } = CONFIG[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-machina text-[11px] font-[800] uppercase tracking-wide",
        className
      )}
    >
      <Icon
        size={11}
        className={status === "processing" ? "animate-spin" : undefined}
      />
      {label}
    </span>
  );
}
