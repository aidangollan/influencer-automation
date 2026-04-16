export type Step = 1 | 2 | 3 | 4;

export type SceneStatus = "pending" | "generating" | "complete" | "failed";

export type ScenePlan = {
  imagePrompt: string;
  imageSource: "original" | "previous" | "skip";
  showProduct: boolean;
  videoPrompt: string;
  clipDuration: 5 | 10;
  estimatedDuration: number;
};

export type Scene = {
  id: string;
  scriptLine: string;
  status: SceneStatus;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  accepted: boolean;
  // Scene plan fields
  imagePrompt: string;
  imageSource: "original" | "previous" | "skip";
  showProduct: boolean;
  videoPrompt: string;
  // Tracking for async generation
  phase: "idle" | "image" | "video";
  jobId: string | null;
  jobModel: string | null;
  clipDuration: 5 | 10;
  duration: number | null;
};

export type FlowState = {
  step: Step;
  reelUrl: string;
  productInfo: string;
  productUrl: string;
  influencerImage: string | null;
  scriptLines: string[];
  scenePlans: ScenePlan[];
  productImages: string[];
  productSummary: string;
  scenes: Scene[];
  finalVideoUrl: string | null;
  isGeneratingScript: boolean;
  generationStatus: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
