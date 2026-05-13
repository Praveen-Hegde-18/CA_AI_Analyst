export type UploadStatus = "completed" | "processing" | "failed";

export interface UploadRecord {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  duration: string;
  status: UploadStatus;
}

export interface KeyPoint {
  text: string;
  type: "pass" | "warn";
}

export interface ShotAnalysisData {
  shotType: string;
  battingHand: "Right Handed" | "Left Handed";
  confidence: number;
  side: string;
  verdict: string;
  verdictDetail: string;
  keyPoints: KeyPoint[];
  voiceDuration: string;
}
