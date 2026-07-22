export interface ScriptScene {
  id: string;
  order: number;
  heading: string;
  narration: string;
  visualDescription: string;
  duration: number;
  cameraAngle?: string;
  animation?: string;
  transition?: string;
}

export interface ScriptContent {
  scenes: ScriptScene[];
  totalDuration: number;
  wordCount: number;
}

export interface StoryboardFrame {
  id: string;
  sceneId: string;
  order: number;
  prompt: string;
  imageUrl?: string;
  videoUrl?: string;
  duration: number;
  cameraAngle: string;
  animation: string;
  transition: string;
  style: string;
  aspectRatio: string;
  negativePrompt?: string;
  seed?: number;
  modelUsed?: string;
  status: "pending" | "generating" | "completed" | "failed" | "regenerating";
  error?: string;
}

export interface ProjectSettings {
  platform: "youtube" | "tiktok" | "instagram" | "linkedin" | "twitter" | "facebook" | "custom";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
  targetDuration: number;
  language: string;
  tone: string;
  targetAudience?: string;
  callToAction?: string;
  backgroundMusicUrl?: string;
  brandKitId?: string;
}

export interface VideoRenderInput {
  videoId: string;
  projectId: string;
  composition: string;
  inputProps: {
    script: ScriptContent;
    frames: StoryboardFrame[];
    audioAssets: AudioAsset[];
    projectSettings: ProjectSettings;
  };
  storyboardId?: string;
}

export interface AudioAsset {
  id: string;
  url: string;
  sceneId: string;
  duration: number;
  type: "voiceover" | "music" | "sound_effect";
}

export interface VideoOutput {
  id: string;
  projectId: string;
  version: number;
  status: "queued" | "rendering" | "completed" | "failed" | "exporting";
  outputUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  fileSize?: number;
  renderProgress: number;
  error?: string;
}

export interface BrandKit {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textOnPrimary: string;
    error: string;
    warning: string;
    success: string;
  };
  fonts: {
    heading: { family: string; weight: number; url?: string };
    body: { family: string; weight: number; url?: string };
    mono: { family: string; weight: number; url?: string };
  };
  logo: {
    lightUrl: string;
    darkUrl: string;
    markUrl?: string;
  };
  tone: {
    voice: string;
    personality: string[];
    doNotUse: string[];
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: "social" | "education" | "marketing" | "product" | "personal" | "corporate";
  platform: "youtube" | "tiktok" | "reels" | "shorts" | "linkedin" | "twitter" | "custom";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
  duration: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  structure: {
    scenes: Array<{
      type: "hook" | "intro" | "content" | "cta" | "outro";
      duration: number;
      template: string;
    }>;
  };
  defaultStyle: string;
  tags: string[];
  isPublic: boolean;
  isOfficial: boolean;
}

export interface Asset {
  id: string;
  projectId?: string;
  organizationId?: string;
  userId: string;
  type: "image" | "video" | "audio" | "font" | "lottie" | "document";
  name: string;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  source: "upload" | "generated" | "stock" | "imported";
  generationPrompt?: string;
  generationModel?: string;
  tags: string[];
  isPublic: boolean;
}

export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  parentId?: string;
  content: string;
  position?: {
    x?: number;
    y?: number;
    time?: number;
    sceneId?: string;
    elementId?: string;
  };
  type: "comment" | "suggestion" | "approval" | "change_request";
  status: "open" | "resolved";
}

export interface Collaboration {
  id: string;
  projectId: string;
  userId: string;
  invitedBy: string;
  role: "editor" | "commenter" | "viewer" | "approver";
  permissions: {
    canEditScript: boolean;
    canEditStoryboard: boolean;
    canEditVideo: boolean;
    canComment: boolean;
    canApprove: boolean;
    canExport: boolean;
    canManageCollaborators: boolean;
  };
  status: "pending" | "accepted" | "declined" | "revoked";
}

export interface Notification {
  id: string;
  userId: string;
  organizationId?: string;
  type: "project_complete" | "render_failed" | "comment" | "mention" | "approval_request" | "approval_granted" | "credit_low" | "subscription_change" | "team_invite" | "system";
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  organizationId?: string;
  type: "purchase" | "usage" | "refund" | "bonus" | "subscription_grant" | "referral";
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: {
    projectId?: string;
    videoId?: string;
    stripeInvoiceId?: string;
    stripePaymentIntentId?: string;
    feature?: "video_generation" | "voiceover" | "music" | "asset_generation";
    units?: number;
    unitCost?: number;
  };
}

export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "incomplete_expired" | "unpaid";
  tier: "free" | "pro" | "team" | "enterprise";
  interval: "month" | "year";
  quantity: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
}