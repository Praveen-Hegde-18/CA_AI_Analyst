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

export interface PhaseScores {
  backswing: number;
  impact: number;
  followThrough: number;
}

export interface ShotAnalysisData {
  shotType: string;
  battingHand: "Right Handed" | "Left Handed";
  confidence: number;
  side: string;
  verdict: string;
  verdictDetail: string;
  keyPoints: KeyPoint[];
  shotSummary: string;
  // Optional ML pipeline metrics — present when real backend data is returned
  quality?: string;
  poseScore?: number;
  similarity?: number;
  ruleScore?: number;
  phaseScores?: PhaseScores;
  impactDetected?: boolean;
  impactConfidence?: number;
  f1Score?: number | null;
}
