import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { users, projects, scripts, storyboards, videos, assets, projectVersions } from "@/lib/db/schema";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import crypto from "crypto";
import { projectsApp } from "@/app/api/v1/projects/route";

// ============================================================================
// Hono App Setup
// ============================================================================

const app = new Hono<{
  Bindings: {
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
  };
  Variables: {
    userId: string;
    orgId?: string;
  };
}>();

// CORS for API routes
app.use("*", cors({
  origin: env.NEXT_PUBLIC_APP_URL,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
}));

// Clerk authentication middleware - using custom implementation since @hono/clerk-auth may not be available
app.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // TODO: Verify Clerk JWT token here
    // For now, extract userId from token (in production, use Clerk SDK)
    try {
      // Simple JWT decode (without verification for dev)
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.sub) {
        c.set("userId", payload.sub);
        c.set("orgId", payload.org_id);
      }
    } catch {
      // Invalid token, continue without auth
    }
  }
  await next();
});

// ============================================================================
// Validation Schemas
// ============================================================================

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  prompt: z.string().min(10).max(10000),
  platform: z.enum(["youtube", "tiktok", "instagram", "linkedin", "twitter", "facebook", "custom"]).default("youtube"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5", "21:9"]).default("16:9"),
  targetDuration: z.number().int().min(15).max(600).default(60),
  language: z.string().length(2).default("en"),
  tone: z.string().max(100).optional(),
  targetAudience: z.string().max(200).optional(),
  callToAction: z.string().max(200).optional(),
  brandKitId: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const generateScriptSchema = z.object({
  projectId: z.string(),
  prompt: z.string().min(10).max(10000).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(100).max(8000).default(4000),
});

const generateStoryboardSchema = z.object({
  scriptId: z.string(),
  styleReference: z.string().url().optional(),
  overallStyle: z.string().max(500).optional(),
  model: z.string().optional(),
});

const createAssetSchema = z.object({
  projectId: z.string().optional(),
  organizationId: z.string().optional(),
  type: z.enum(["image", "video", "audio", "font", "lottie", "document"]),
  name: z.string().min(1).max(200),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
  source: z.enum(["upload", "generated", "stock", "imported"]).default("upload"),
  generationPrompt: z.string().optional(),
  generationModel: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", async (c) => {
  const { healthCheck } = await import("@/lib/db/client");
  const health = await healthCheck();
  return c.json({ 
    status: health.healthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    latencyMs: health.latencyMs,
    version: process.env.npm_package_version || "0.1.0",
  });
});

// ============================================================================
// User Routes
// ============================================================================

app.get("/users/me", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({ user });
});

app.patch("/users/me", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const body = await c.req.json();
  const { name, imageUrl, preferences } = body;

  const updated = await db.update(users)
    .set({ 
      name: name ?? undefined,
      imageUrl: imageUrl ?? undefined,
      preferences: preferences ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()
    .get();

  return c.json({ user: updated });
});

// ============================================================================
// Project Routes
// ============================================================================

app.get("/projects", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { page = "1", limit = "20", status, organizationId } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(projects.userId, userId)];
  if (status) conditions.push(eq(projects.status, status as any));
  if (organizationId) conditions.push(eq(projects.organizationId, organizationId));

  const [projectList, totalCount] = await Promise.all([
    db.select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: count() }).from(projects).where(and(...conditions)).get(),
  ]);

  return c.json({
    projects: projectList,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount?.count || 0,
      totalPages: Math.ceil((totalCount?.count || 0) / limitNum),
    },
  });
});

app.post("/projects", zValidator("json", createProjectSchema), async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const data = c.req.valid("json");
  const orgId = c.get("orgId");
  const now = new Date();
  const projectId = crypto.randomUUID();

  const newProject = await db.insert(projects).values({
    id: projectId,
    userId,
    organizationId: orgId,
    title: data.title,
    description: data.description,
    prompt: data.prompt,
    platform: data.platform,
    aspectRatio: data.aspectRatio,
    targetDuration: data.targetDuration,
    language: data.language,
    tone: data.tone,
    targetAudience: data.targetAudience,
    callToAction: data.callToAction,
    brandKitId: data.brandKitId,
    status: "draft",
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  // Create initial project version
  await db.insert(projectVersions).values({
    id: crypto.randomUUID(),
    projectId: newProject.id,
    version: 1,
    title: data.title,
    prompt: data.prompt,
    createdBy: userId,
    message: "Initial project creation",
    createdAt: now,
  });

  return c.json({ project: newProject }, 201);
});

app.get("/projects/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const projectId = c.req.param("id");
  const project = await db.select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // Fetch related data
  const [script, storyboard, video, assetList] = await Promise.all([
    db.select().from(scripts).where(eq(scripts.projectId, projectId)).orderBy(desc(scripts.version)).limit(1).get(),
    db.select().from(storyboards).where(eq(storyboards.projectId, projectId)).orderBy(desc(storyboards.version)).limit(1).get(),
    db.select().from(videos).where(eq(videos.projectId, projectId)).orderBy(desc(videos.version)).limit(1).get(),
    db.select().from(assets).where(eq(assets.projectId, projectId)).limit(50),
  ]);

  return c.json({
    project,
    script,
    storyboard,
    video,
    assets: assetList,
  });
});

app.patch("/projects/:id", zValidator("json", updateProjectSchema), async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const projectId = c.req.param("id");
  const data = c.req.valid("json");

  const existing = await db.select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();

  if (!existing) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const updated = await db.update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning()
    .get();

  // Create new version if prompt changed
  if (data.prompt && data.prompt !== existing.prompt) {
    const newVersion = existing.currentVersion + 1;
    await db.update(projects).set({ currentVersion: newVersion }).where(eq(projects.id, projectId));
    await db.insert(projectVersions).values({
      id: crypto.randomUUID(),
      projectId,
      version: newVersion,
      title: data.title ?? existing.title,
      prompt: data.prompt,
      createdBy: userId,
      message: "Prompt updated",
      createdAt: new Date(),
    });
  }

  return c.json({ project: updated });
});

app.delete("/projects/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const projectId = c.req.param("id");
  const result = await db.delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id })
    .get();

  if (!result) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  return c.json({ success: true });
});

// ============================================================================
// Script Routes
// ============================================================================

app.get("/projects/:projectId/scripts", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const projectId = c.req.param("projectId");
  
  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();
  
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const scriptList = await db.select()
    .from(scripts)
    .where(eq(scripts.projectId, projectId))
    .orderBy(desc(scripts.version));

  return c.json({ scripts: scriptList });
});

app.post("/scripts/generate", zValidator("json", generateScriptSchema), async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { projectId, prompt, model, temperature, maxTokens } = c.req.valid("json");

  // Verify project ownership
  const project = await db.select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // TODO: Call AI service to generate script
  // For now, return a placeholder response
  const now = new Date();

  const newScript = await db.insert(scripts).values({
    id: crypto.randomUUID(),
    projectId,
    version: 1,
    content: {
      scenes: [
        {
          id: crypto.randomUUID(),
          order: 1,
          heading: "Hook",
          narration: prompt || project.prompt,
          visualDescription: "Opening visual hook",
          duration: 5,
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          heading: "Content",
          narration: "Main content goes here",
          visualDescription: "Supporting visuals",
          duration: project.targetDuration - 10,
        },
        {
          id: crypto.randomUUID(),
          order: 3,
          heading: "CTA",
          narration: project.callToAction || "Subscribe for more!",
          visualDescription: "Call to action visual",
          duration: 5,
        },
      ],
      totalDuration: project.targetDuration,
      wordCount: (prompt || project.prompt).split(" ").length * 3,
    },
    metadata: {
      hook: "Generated hook",
      structure: ["hook", "content", "cta"],
      keywords: [],
      readingLevel: "medium",
    },
    status: "draft",
    generatedBy: "ai",
    modelUsed: model || "openrouter/auto",
    promptUsed: prompt || project.prompt,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  // Update project status
  await db.update(projects)
    .set({ status: "scripting", updatedAt: now })
    .where(eq(projects.id, projectId));

  return c.json({ script: newScript }, 201);
});

app.get("/scripts/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const scriptId = c.req.param("id");
  const script = await db.select()
    .from(scripts)
    .where(eq(scripts.id, scriptId))
    .get();

  if (!script) {
    throw new HTTPException(404, { message: "Script not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, script.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return c.json({ script });
});

app.patch("/scripts/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const scriptId = c.req.param("id");
  const body = await c.req.json();
  const { content, status, metadata } = body;

  const script = await db.select().from(scripts).where(eq(scripts.id, scriptId)).get();
  if (!script) {
    throw new HTTPException(404, { message: "Script not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, script.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const updated = await db.update(scripts)
    .set({ 
      content: content ?? undefined,
      status: status ?? undefined,
      metadata: metadata ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(scripts.id, scriptId))
    .returning()
    .get();

  return c.json({ script: updated });
});

// ============================================================================
// Storyboard Routes
// ============================================================================

app.get("/projects/:projectId/storyboards", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const projectId = c.req.param("projectId");
  
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();
  
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const storyboardList = await db.select()
    .from(storyboards)
    .where(eq(storyboards.projectId, projectId))
    .orderBy(desc(storyboards.version));

  return c.json({ storyboards: storyboardList });
});

app.post("/storyboards/generate", zValidator("json", generateStoryboardSchema), async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { scriptId, styleReference, overallStyle, model } = c.req.valid("json");

  const script = await db.select().from(scripts).where(eq(scripts.id, scriptId)).get();
  if (!script) {
    throw new HTTPException(404, { message: "Script not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, script.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  // TODO: Call AI service to generate storyboard frames
  // For now, create placeholder frames from script scenes
  const frames = (script.content as any).scenes.map((scene: any, index: number) => ({
    id: crypto.randomUUID(),
    sceneId: scene.id,
    order: index,
    prompt: `Visual for: ${scene.visualDescription}`,
    duration: scene.duration,
    cameraAngle: "eye-level",
    animation: "fade-in",
    transition: index === 0 ? "none" : "cut",
    style: overallStyle || "cinematic",
    aspectRatio: "16:9",
    status: "pending" as const,
  }));

  const now = new Date();

  const newStoryboard = await db.insert(storyboards).values({
    id: crypto.randomUUID(),
    projectId: script.projectId,
    scriptId,
    version: 1,
    frames,
    styleReference,
    overallStyle,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  // Update project status
  await db.update(projects)
    .set({ status: "storyboarding", updatedAt: now })
    .where(eq(projects.id, script.projectId));

  return c.json({ storyboard: newStoryboard }, 201);
});

app.get("/storyboards/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const storyboardId = c.req.param("id");
  const storyboard = await db.select().from(storyboards).where(eq(storyboards.id, storyboardId)).get();

  if (!storyboard) {
    throw new HTTPException(404, { message: "Storyboard not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, storyboard.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return c.json({ storyboard });
});

app.patch("/storyboards/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const storyboardId = c.req.param("id");
  const body = await c.req.json();
  const { frames, status, overallStyle } = body;

  const storyboard = await db.select().from(storyboards).where(eq(storyboards.id, storyboardId)).get();
  if (!storyboard) {
    throw new HTTPException(404, { message: "Storyboard not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, storyboard.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const updated = await db.update(storyboards)
    .set({ 
      frames: frames ?? undefined,
      status: status ?? undefined,
      overallStyle: overallStyle ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(storyboards.id, storyboardId))
    .returning()
    .get();

  return c.json({ storyboard: updated });
});

// ============================================================================
// Asset Routes
// ============================================================================

app.get("/assets", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const { projectId, type, page = "1", limit = "50" } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(assets.userId, userId)];
  if (projectId) conditions.push(eq(assets.projectId, projectId));
  if (type) conditions.push(eq(assets.type, type as any));

  const [assetList, totalCount] = await Promise.all([
    db.select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: count() }).from(assets).where(and(...conditions)).get(),
  ]);

  return c.json({
    assets: assetList,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount?.count || 0,
      totalPages: Math.ceil((totalCount?.count || 0) / limitNum),
    },
  });
});

app.post("/assets", zValidator("json", createAssetSchema), async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const data = c.req.valid("json");
  const orgId = c.get("orgId");

  // Verify project ownership if projectId provided
  if (data.projectId) {
    const project = await db.select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)))
      .get();
    if (!project) {
      throw new HTTPException(403, { message: "Project not found or access denied" });
    }
  }

  const newAsset = await db.insert(assets).values({
    id: crypto.randomUUID(),
    projectId: data.projectId,
    organizationId: data.organizationId ?? orgId,
    userId,
    type: data.type,
    name: data.name,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    mimeType: data.mimeType,
    size: data.size,
    width: data.width,
    height: data.height,
    duration: data.duration,
    source: data.source,
    generationPrompt: data.generationPrompt,
    generationModel: data.generationModel,
    tags: data.tags,
    isPublic: data.isPublic,
  }).returning().get();

  return c.json({ asset: newAsset }, 201);
});

app.get("/assets/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const assetId = c.req.param("id");
  const asset = await db.select().from(assets).where(eq(assets.id, assetId)).get();

  if (!asset) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  // Check access
  if (asset.userId !== userId && !asset.isPublic) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return c.json({ asset });
});

app.delete("/assets/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const assetId = c.req.param("id");
  const result = await db.delete(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId)))
    .returning({ id: assets.id })
    .get();

  if (!result) {
    throw new HTTPException(404, { message: "Asset not found" });
  }

  return c.json({ success: true });
});

// ============================================================================
// Video Routes
// ============================================================================

app.get("/projects/:projectId/videos", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const projectId = c.req.param("projectId");
  
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();
  
  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const videoList = await db.select()
    .from(videos)
    .where(eq(videos.projectId, projectId))
    .orderBy(desc(videos.version));

  return c.json({ videos: videoList });
});

app.post("/videos/render", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const body = await c.req.json();
  const { projectId, storyboardId, composition, inputProps } = body;

  // Verify project ownership
  const project = await db.select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  // TODO: Queue render job via Inngest
  // For now, create video record
  const now = new Date();

  const newVideo = await db.insert(videos).values({
    id: crypto.randomUUID(),
    projectId,
    version: 1,
    status: "queued",
    remotionComposition: composition || "Main",
    inputProps: inputProps || {},
    width: 1920,
    height: 1080,
    fps: 30,
    codec: "h264",
  }).returning().get();

  // Update project status
  await db.update(projects)
    .set({ status: "rendering", updatedAt: now })
    .where(eq(projects.id, projectId));

  // TODO: Trigger Inngest render job
  // await inngest.send({ name: "video/render", data: { videoId, projectId, composition, inputProps } });

  return c.json({ video: newVideo }, 201);
});

app.get("/videos/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const videoId = c.req.param("id");
  const video = await db.select().from(videos).where(eq(videos.id, videoId)).get();

  if (!video) {
    throw new HTTPException(404, { message: "Video not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, video.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return c.json({ video });
});

app.patch("/videos/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const videoId = c.req.param("id");
  const body = await c.req.json();
  const { status, outputUrl, thumbnailUrl, duration, fileSize, error, renderProgress } = body;

  const video = await db.select().from(videos).where(eq(videos.id, videoId)).get();
  if (!video) {
    throw new HTTPException(404, { message: "Video not found" });
  }

  // Verify project ownership
  const project = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, video.projectId), eq(projects.userId, userId)))
    .get();

  if (!project) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const now = new Date();
  const updateData: any = { 
    updatedAt: now,
  };
  
  if (status !== undefined) updateData.status = status;
  if (outputUrl !== undefined) updateData.outputUrl = outputUrl;
  if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
  if (duration !== undefined) updateData.duration = duration;
  if (fileSize !== undefined) updateData.fileSize = fileSize;
  if (error !== undefined) updateData.error = error;
  if (renderProgress !== undefined) updateData.renderProgress = renderProgress;
  if (status === "rendering") updateData.startedAt = now;
  if (status === "completed" || status === "failed") updateData.completedAt = now;

  const updated = await db.update(videos)
    .set(updateData)
    .where(eq(videos.id, videoId))
    .returning()
    .get();

  // Update project status if video completed
  if (status === "completed") {
    await db.update(projects)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(eq(projects.id, video.projectId));
  } else if (status === "failed") {
    await db.update(projects)
      .set({ status: "failed", updatedAt: now })
      .where(eq(projects.id, video.projectId));
  }

  return c.json({ video: updated });
});

// ============================================================================
// Mount Projects Routes
// ============================================================================

app.route("/projects", projectsApp);

// ============================================================================
// Next.js App Router Handler
// ============================================================================

import { handle } from "hono/vercel";

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

// Type exports for client
export type AppType = typeof app;
