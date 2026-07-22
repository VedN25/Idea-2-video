import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),
  role: text("role", { enum: ["user", "admin", "owner"] }).default("user").notNull(),
  credits: integer("credits").default(100).notNull(),
  subscriptionTier: text("subscription_tier", { enum: ["free", "pro", "team", "enterprise"] }).default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  subscriptionStatus: text("subscription_status", { enum: ["active", "canceled", "past_due", "trialing", "incomplete"] }),
  subscriptionCurrentPeriodEnd: integer("subscription_current_period_end", { mode: "timestamp" }),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false).notNull(),
  onboardingStep: text("onboarding_step").default("welcome"),
  preferences: text("preferences", { mode: "json" }).$type<{
    defaultPlatform?: string;
    defaultLength?: number;
    defaultLanguage?: string;
    brandKitId?: string;
    notifications?: { email: boolean; push: boolean; inApp: boolean };
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  stripeCustomerIdx: index("users_stripe_customer_idx").on(table.stripeCustomerId),
}));

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionTier: text("subscription_tier", { enum: ["free", "pro", "team", "enterprise"] }).default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  settings: text("settings", { mode: "json" }).$type<{
    defaultBrandKitId?: string;
    allowedDomains?: string[];
    requireApproval?: boolean;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  slugIdx: uniqueIndex("orgs_slug_idx").on(table.slug),
  ownerIdx: index("orgs_owner_idx").on(table.ownerId),
}));

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "editor", "viewer"] }).default("editor").notNull(),
  invitedBy: text("invited_by").references(() => users.id),
  invitedAt: integer("invited_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" }),
}, (table) => ({
  orgUserIdx: uniqueIndex("org_members_org_user_idx").on(table.organizationId, table.userId),
  userIdx: index("org_members_user_idx").on(table.userId),
}));

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(), // Original user prompt
  platform: text("platform", { enum: ["youtube", "tiktok", "instagram", "linkedin", "twitter", "facebook", "custom"] }).default("youtube").notNull(),
  aspectRatio: text("aspect_ratio", { enum: ["16:9", "9:16", "1:1", "4:5", "21:9"] }).default("16:9").notNull(),
  targetDuration: integer("target_duration").default(60).notNull(), // seconds
  language: text("language").default("en").notNull(),
  tone: text("tone"),
  targetAudience: text("target_audience"),
  callToAction: text("call_to_action"),
  brandKitId: text("brand_kit_id"),
  status: text("status", { enum: ["draft", "scripting", "storyboarding", "rendering", "completed", "failed", "archived"] }).default("draft").notNull(),
  currentVersion: integer("current_version").default(1).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  metadata: text("metadata", { mode: "json" }).$type<{
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    hashtags?: string[];
    category?: string;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
}, (table) => ({
  userIdx: index("projects_user_idx").on(table.userId),
  orgIdx: index("projects_org_idx").on(table.organizationId),
  statusIdx: index("projects_status_idx").on(table.status),
  createdIdx: index("projects_created_idx").on(table.createdAt),
}));

export const projectVersions = sqliteTable("project_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  scriptId: text("script_id"),
  storyboardId: text("storyboard_id"),
  videoId: text("video_id"),
  changes: text("changes", { mode: "json" }).$type<Array<{
    type: "script" | "storyboard" | "visual" | "audio" | "timing" | "style";
    description: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>>(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  message: text("message"), // Commit message
}, (table) => ({
  projectVersionIdx: uniqueIndex("project_versions_project_version_idx").on(table.projectId, table.version),
  projectIdx: index("project_versions_project_idx").on(table.projectId),
}));

export const scripts = sqliteTable("scripts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  content: text("content", { mode: "json" }).$type<{
    scenes: Array<{
      id: string;
      order: number;
      heading: string;
      narration: string;
      visualDescription: string;
      duration: number; // estimated seconds
      cameraAngle?: string;
      animation?: string;
      transition?: string;
    }>;
    totalDuration: number;
    wordCount: number;
  }>().notNull(),
  metadata: text("metadata", { mode: "json" }).$type<{
    hook?: string;
    structure?: string[];
    keywords?: string[];
    readingLevel?: string;
  }>(),
  status: text("status", { enum: ["draft", "review", "approved", "regenerating"] }).default("draft").notNull(),
  generatedBy: text("generated_by", { enum: ["ai", "user", "hybrid"] }).default("ai").notNull(),
  modelUsed: text("model_used"),
  promptUsed: text("prompt_used"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  projectIdx: index("scripts_project_idx").on(table.projectId),
  projectVersionIdx: uniqueIndex("scripts_project_version_idx").on(table.projectId, table.version),
}));

export const storyboards = sqliteTable("storyboards", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  scriptId: text("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  frames: text("frames", { mode: "json" }).$type<Array<{
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
  }>>().notNull(),
  styleReference: text("style_reference"), // URL or base64
  overallStyle: text("overall_style"),
  status: text("status", { enum: ["draft", "generating", "review", "approved", "regenerating"] }).default("draft").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  projectIdx: index("storyboards_project_idx").on(table.projectId),
  scriptIdx: index("storyboards_script_idx").on(table.scriptId),
}));

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["image", "video", "audio", "font", "lottie", "document"] }).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  mimeType: text("mime_type"),
  size: integer("size"), // bytes
  width: integer("width"),
  height: integer("height"),
  duration: real("duration"), // seconds for video/audio
  source: text("source", { enum: ["upload", "generated", "stock", "imported"] }).default("upload").notNull(),
  generationPrompt: text("generation_prompt"),
  generationModel: text("generation_model"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]).notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  projectIdx: index("assets_project_idx").on(table.projectId),
  orgIdx: index("assets_org_idx").on(table.organizationId),
  userIdx: index("assets_user_idx").on(table.userId),
  typeIdx: index("assets_type_idx").on(table.type),
}));

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  status: text("status", { enum: ["queued", "rendering", "completed", "failed", "exporting"] }).default("queued").notNull(),
  remotionComposition: text("remotion_composition").notNull(), // Composition ID
  inputProps: text("input_props", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  outputUrl: text("output_url"),
  thumbnailUrl: text("thumbnail_url"),
  duration: real("duration"), // seconds
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  fps: integer("fps").default(30).notNull(),
  codec: text("codec").default("h264").notNull(),
  bitrate: integer("bitrate"),
  fileSize: integer("file_size"), // bytes
  renderId: text("render_id"), // Remotion render ID
  renderProgress: integer("render_progress").default(0).notNull(), // 0-100
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  projectIdx: index("videos_project_idx").on(table.projectId),
  statusIdx: index("videos_status_idx").on(table.status),
  renderIdx: index("videos_render_idx").on(table.renderId),
}));

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  storyboardFrameId: text("storyboard_frame_id"),
  order: integer("order").notNull(),
  startTime: real("start_time").notNull(), // seconds
  endTime: real("end_time").notNull(), // seconds
  duration: real("duration").notNull(), // seconds
  composition: text("composition", { mode: "json" }).$type<{
    tracks: Array<{
      id: string;
      type: "video" | "image" | "text" | "shape" | "audio";
      elementId: string;
      startTime: number;
      endTime: number;
      props: Record<string, unknown>;
    }>;
    backgroundColor?: string;
    backgroundImage?: string;
  }>(),
  transition: text("transition", { mode: "json" }).$type<{
    type: "cut" | "fade" | "slide" | "zoom" | "wipe" | "custom";
    duration: number;
    direction?: string;
    easing?: string;
  }>(),
  effects: text("effects", { mode: "json" }).$type<Array<{
    type: "colorGrade" | "blur" | "shake" | "glitch" | "vignette" | "custom";
    params: Record<string, unknown>;
  }>>().default([]).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  videoIdx: index("scenes_video_idx").on(table.videoId),
  videoOrderIdx: uniqueIndex("scenes_video_order_idx").on(table.videoId, table.order),
}));

export const voiceovers = sqliteTable("voiceovers", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  text: text("text").notNull(),
  voiceId: text("voice_id").notNull(), // ElevenLabs voice ID
  voiceName: text("voice_name"),
  voiceSettings: text("voice_settings", { mode: "json" }).$type<{
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  }>(),
  audioUrl: text("audio_url"),
  duration: real("duration"), // seconds
  status: text("status", { enum: ["pending", "generating", "completed", "failed"] }).default("pending").notNull(),
  modelUsed: text("model_used").default("eleven_multilingual_v2").notNull(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  videoIdx: index("voiceovers_video_idx").on(table.videoId),
  sceneIdx: index("voiceovers_scene_idx").on(table.sceneId),
}));

export const musicTracks = sqliteTable("music_tracks", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  sceneId: text("scene_id").references(() => scenes.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  type: text("type", { enum: ["background", "sound_effect", "intro", "outro", "transition"] }).default("background").notNull(),
  title: text("title"),
  artist: text("artist"),
  audioUrl: text("audio_url").notNull(),
  startTime: real("start_time").default(0).notNull(), // seconds from video start
  endTime: real("end_time"), // seconds from video start
  volume: real("volume").default(1).notNull(), // 0-1
  fadeIn: real("fade_in").default(0).notNull(), // seconds
  fadeOut: real("fade_out").default(0).notNull(), // seconds
  source: text("source", { enum: ["generated", "uploaded", "library", "ai"] }).default("library").notNull(),
  generationPrompt: text("generation_prompt"),
  license: text("license"),
  status: text("status", { enum: ["pending", "generating", "completed", "failed"] }).default("pending").notNull(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  videoIdx: index("music_tracks_video_idx").on(table.videoId),
  sceneIdx: index("music_tracks_scene_idx").on(table.sceneId),
}));

export const brandKits = sqliteTable("brand_kits", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
  colors: text("colors", { mode: "json" }).$type<{
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textOnPrimary: string;
    error: string;
    warning: string;
    success: string;
  }>(),
  fonts: text("fonts", { mode: "json" }).$type<{
    heading: { family: string; weight: number; url?: string };
    body: { family: string; weight: number; url?: string };
    mono: { family: string; weight: number; url?: string };
  }>(),
  logo: text("logo", { mode: "json" }).$type<{
    lightUrl: string;
    darkUrl: string;
    markUrl?: string;
  }>(),
  tone: text("tone", { mode: "json" }).$type<{
    voice: string; // e.g., "professional", "friendly", "witty", "authoritative"
    personality: string[];
    doNotUse: string[];
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  orgIdx: index("brand_kits_org_idx").on(table.organizationId),
  userIdx: index("brand_kits_user_idx").on(table.userId),
}));

export const credits = sqliteTable("credits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["purchase", "usage", "refund", "bonus", "subscription_grant", "referral"] }).notNull(),
  amount: integer("amount").notNull(), // positive for credit, negative for debit
  balanceAfter: integer("balance_after").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<{
    projectId?: string;
    videoId?: string;
    stripeInvoiceId?: string;
    stripePaymentIntentId?: string;
    feature?: string; // "video_generation", "voiceover", "music", "asset_generation"
    units?: number;
    unitCost?: number;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  userIdx: index("credits_user_idx").on(table.userId),
  orgIdx: index("credits_org_idx").on(table.organizationId),
  createdIdx: index("credits_created_idx").on(table.createdAt),
}));

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  status: text("status", { enum: ["active", "canceled", "past_due", "trialing", "incomplete", "incomplete_expired", "unpaid"] }).notNull(),
  tier: text("tier", { enum: ["free", "pro", "team", "enterprise"] }).notNull(),
  interval: text("interval", { enum: ["month", "year"] }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  currentPeriodStart: integer("current_period_start", { mode: "timestamp" }).notNull(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }).notNull(),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).default(false).notNull(),
  canceledAt: integer("canceled_at", { mode: "timestamp" }),
  trialStart: integer("trial_start", { mode: "timestamp" }),
  trialEnd: integer("trial_end", { mode: "timestamp" }),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  userIdx: index("subscriptions_user_idx").on(table.userId),
  orgIdx: index("subscriptions_org_idx").on(table.organizationId),
  stripeSubIdx: uniqueIndex("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
  stripeCustIdx: index("subscriptions_stripe_cust_idx").on(table.stripeCustomerId),
}));

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["project_complete", "render_failed", "comment", "mention", "approval_request", "approval_granted", "credit_low", "subscription_change", "team_invite", "system"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
  isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
  actionUrl: text("action_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  orgIdx: index("notifications_org_idx").on(table.organizationId),
  readIdx: index("notifications_read_idx").on(table.isRead),
  createdIdx: index("notifications_created_idx").on(table.createdAt),
}));

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", { enum: ["social", "education", "marketing", "product", "personal", "corporate"] }).notNull(),
  platform: text("platform", { enum: ["youtube", "tiktok", "reels", "shorts", "linkedin", "twitter", "custom"] }).notNull(),
  aspectRatio: text("aspect_ratio", { enum: ["16:9", "9:16", "1:1", "4:5", "21:9"] }).notNull(),
  duration: integer("duration").notNull(), // seconds
  thumbnailUrl: text("thumbnail_url"),
  previewUrl: text("preview_url"),
  structure: text("structure", { mode: "json" }).$type<{
    scenes: Array<{
      type: string; // "hook", "intro", "content", "cta", "outro"
      duration: number;
      template: string; // Prompt template with placeholders
    }>;
  }>().notNull(),
  defaultStyle: text("default_style"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]).notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
  isOfficial: integer("is_official", { mode: "boolean" }).default(false).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  orgIdx: index("templates_org_idx").on(table.organizationId),
  userIdx: index("templates_user_idx").on(table.userId),
  categoryIdx: index("templates_category_idx").on(table.category),
  platformIdx: index("templates_platform_idx").on(table.platform),
}));

export const collaborations = sqliteTable("collaborations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  invitedBy: text("invited_by").notNull().references(() => users.id),
  role: text("role", { enum: ["editor", "commenter", "viewer", "approver"] }).default("editor").notNull(),
  permissions: text("permissions", { mode: "json" }).$type<{
    canEditScript: boolean;
    canEditStoryboard: boolean;
    canEditVideo: boolean;
    canComment: boolean;
    canApprove: boolean;
    canExport: boolean;
    canManageCollaborators: boolean;
  }>().default({
    canEditScript: true,
    canEditStoryboard: true,
    canEditVideo: true,
    canComment: true,
    canApprove: false,
    canExport: true,
    canManageCollaborators: false,
  }).notNull(),
  status: text("status", { enum: ["pending", "accepted", "declined", "revoked"] }).default("pending").notNull(),
  invitedAt: integer("invited_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  lastViewedAt: integer("last_viewed_at", { mode: "timestamp" }),
}, (table) => ({
  projectIdx: index("collaborations_project_idx").on(table.projectId),
  userIdx: index("collaborations_user_idx").on(table.userId),
  projectUserIdx: uniqueIndex("collaborations_project_user_idx").on(table.projectId, table.userId),
}));

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"), // Self-referential, no FK constraint to avoid drizzle-kit issues
  content: text("content").notNull(),
  position: text("position", { mode: "json" }).$type<{
    x?: number;
    y?: number;
    time?: number; // video timestamp
    sceneId?: string;
    elementId?: string;
  }>(),
  type: text("type", { enum: ["comment", "suggestion", "approval", "change_request"] }).default("comment").notNull(),
  status: text("status", { enum: ["open", "resolved", "dismissed"] }).default("open").notNull(),
  resolvedBy: text("resolved_by").references(() => users.id),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  projectIdx: index("comments_project_idx").on(table.projectId),
  userIdx: index("comments_user_idx").on(table.userId),
  parentIdx: index("comments_parent_idx").on(table.parentId),
  statusIdx: index("comments_status_idx").on(table.status),
}));

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events", { mode: "json" }).$type<string[]>().notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp" }),
  failureCount: integer("failure_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  orgIdx: index("webhooks_org_idx").on(table.organizationId),
}));

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(), // Hashed API key
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  permissions: text("permissions", { mode: "json" }).$type<string[]>().default([]).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  userIdx: index("api_keys_user_idx").on(table.userId),
  orgIdx: index("api_keys_org_idx").on(table.organizationId),
  keyPrefixIdx: uniqueIndex("api_keys_prefix_idx").on(table.keyPrefix),
}));

// Type exports for use across the codebase
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectVersion = typeof projectVersions.$inferSelect;
export type Script = typeof scripts.$inferSelect;
export type NewScript = typeof scripts.$inferInsert;
export type Storyboard = typeof storyboards.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type Voiceover = typeof voiceovers.$inferSelect;
export type MusicTrack = typeof musicTracks.$inferSelect;
export type BrandKit = typeof brandKits.$inferSelect;
export type Credit = typeof credits.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Collaboration = typeof collaborations.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;