import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "@/lib/db/client";
import { projects, projectVersions, scripts, storyboards, videos, assets } from "@/lib/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { createApp, createSuccessResponse, createErrorResponse, getPaginationParams, createPaginationMeta, requireAuth, ProjectIdParamSchema } from "@/lib/api/hono";

// Helper to get current Date (schema uses mode: "timestamp" which expects Date objects)
const nowDate = () => new Date();

const app = createApp();

// Validation schemas
const CreateProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(10000),
  platform: z.enum(["youtube", "tiktok", "instagram", "linkedin", "twitter", "facebook", "custom"]).default("youtube"),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5", "21:9"]).default("16:9"),
  targetDuration: z.number().int().positive().max(3600).default(60),
  language: z.string().length(2).default("en"),
  tone: z.string().max(50).optional(),
  targetAudience: z.string().max(200).optional(),
  callToAction: z.string().max(500).optional(),
  brandKitId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(["draft", "scripting", "storyboarding", "rendering", "completed", "failed", "archived"]).optional(),
});

const ProjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["draft", "scripting", "storyboarding", "rendering", "completed", "failed", "archived"]).optional(),
  platform: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

/**
 * GET /api/v1/projects
 * List all projects for the authenticated user
 */
app.get("/",
  requireAuth(),
  zValidator("query", ProjectQuerySchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { page, limit, status, platform, sort, order, search } = c.req.valid("query");
    const requestId = c.get("requestId");

    try {
      // Build where conditions
      const conditions = [eq(projects.userId, userId)];
      
      if (status) {
        conditions.push(eq(projects.status, status));
      }
      if (platform) {
        conditions.push(eq(projects.platform, platform as "youtube" | "tiktok" | "instagram" | "linkedin" | "twitter" | "facebook" | "custom"));
      }
      if (search) {
        conditions.push(
          sql`(${projects.title} LIKE ${`%${search}%`} OR ${projects.prompt} LIKE ${`%${search}%`})`
        );
      }

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(projects)
        .where(and(...conditions));
      const total = totalResult[0]?.count || 0;

      // Get paginated results
      const orderBy = sort 
        ? (order === "asc" ? sql`${projects[sort as keyof typeof projects]} ASC` : sql`${projects[sort as keyof typeof projects]} DESC`)
        : desc(projects.createdAt);

      const results = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit);

      // Enrich with related data counts
      const enrichedProjects = await Promise.all(
        results.map(async (project) => {
          const [scriptCount, storyboardCount, videoCount, assetCount] = await Promise.all([
            db.select({ count: count() }).from(scripts).where(eq(scripts.projectId, project.id)),
            db.select({ count: count() }).from(storyboards).where(eq(storyboards.projectId, project.id)),
            db.select({ count: count() }).from(videos).where(eq(videos.projectId, project.id)),
            db.select({ count: count() }).from(assets).where(eq(assets.projectId, project.id)),
          ]);

          return {
            ...project,
            _count: {
              scripts: scriptCount[0]?.count || 0,
              storyboards: storyboardCount[0]?.count || 0,
              videos: videoCount[0]?.count || 0,
              assets: assetCount[0]?.count || 0,
            },
          };
        })
      );

      return c.json(createSuccessResponse({
        items: enrichedProjects,
        pagination: createPaginationMeta(page, limit, total),
      }, requestId));
    } catch (error) {
      console.error(`[Projects] List error:`, error);
      return c.json(createErrorResponse(500, "Failed to fetch projects", undefined, requestId), 500);
    }
  }
);

/**
 * POST /api/v1/projects
 * Create a new project
 */
app.post("/",
  requireAuth(),
  zValidator("json", CreateProjectSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = c.req.valid("json");
    const requestId = c.get("requestId");

  try {
      const projectId = crypto.randomUUID();
      const nowDate = new Date();

      const newProject = {
        id: projectId,
        userId,
        organizationId: c.get("orgId"),
        title: data.title,
        description: data.description,
        prompt: data.prompt,
        platform: data.platform as "youtube" | "tiktok" | "instagram" | "linkedin" | "twitter" | "facebook" | "custom",
        aspectRatio: data.aspectRatio,
        targetDuration: data.targetDuration,
        language: data.language,
        tone: data.tone,
        targetAudience: data.targetAudience,
        callToAction: data.callToAction,
        brandKitId: data.brandKitId,
        status: "draft" as const,
        currentVersion: 1,
        metadata: data.metadata || null,
        createdAt: nowDate,
        updatedAt: nowDate,
      };

      await db.insert(projects).values(newProject);

      // Create initial version record in projectVersions table
      await db.insert(projectVersions).values({
        id: crypto.randomUUID(),
        projectId,
        version: 1,
        title: data.title,
        prompt: data.prompt,
        changes: [],
        createdBy: userId,
        createdAt: nowDate,
        message: "Initial version",
      });

      return c.json(createSuccessResponse({
        ...newProject,
        _count: { scripts: 0, storyboards: 0, videos: 0, assets: 0 },
      }, requestId), 201);
    } catch (error) {
      console.error(`[Projects] Create error:`, error);
      return c.json(createErrorResponse(500, "Failed to create project", undefined, requestId), 500);
    }
  }
);

/**
 * GET /api/v1/projects/:projectId
 * Get a single project with full details
 */
app.get("/:projectId",
  requireAuth(),
  zValidator("param", ProjectIdParamSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { projectId } = c.req.valid("param");
    const requestId = c.get("requestId");

    try {
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .get();

      if (!project) {
        return c.json(createErrorResponse(404, "Project not found", undefined, requestId), 404);
      }

      // Fetch related data
      const [latestScript, latestStoryboard, latestVideo, assetCount] = await Promise.all([
        db.select().from(scripts).where(eq(scripts.projectId, projectId)).orderBy(desc(scripts.version)).limit(1).get(),
        db.select().from(storyboards).where(eq(storyboards.projectId, projectId)).orderBy(desc(storyboards.version)).limit(1).get(),
        db.select().from(videos).where(eq(videos.projectId, projectId)).orderBy(desc(videos.version)).limit(1).get(),
        db.select({ count: count() }).from(assets).where(eq(assets.projectId, projectId)).get(),
      ]);

      return c.json(createSuccessResponse({
        ...project,
        metadata: project.metadata ? (typeof project.metadata === 'string' ? JSON.parse(project.metadata) : project.metadata) : null,
        latestScript,
        latestStoryboard,
        latestVideo,
        _count: {
          scripts: 1, // TODO: count all versions
          storyboards: 1,
          videos: 1,
          assets: assetCount?.count || 0,
        },
      }, requestId));
    } catch (error) {
      console.error(`[Projects] Get error:`, error);
      return c.json(createErrorResponse(500, "Failed to fetch project", undefined, requestId), 500);
    }
  }
);

/**
 * PATCH /api/v1/projects/:projectId
 * Update a project
 */
app.patch("/:projectId",
  requireAuth(),
  zValidator("param", ProjectIdParamSchema),
  zValidator("json", UpdateProjectSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { projectId } = c.req.valid("param");
    const data = c.req.valid("json");
    const requestId = c.get("requestId");

    try {
      // Check ownership
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .get();

      if (!project) {
        return c.json(createErrorResponse(404, "Project not found", undefined, requestId), 404);
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.prompt !== undefined) updateData.prompt = data.prompt;
      if (data.platform !== undefined) updateData.platform = data.platform;
      if (data.aspectRatio !== undefined) updateData.aspectRatio = data.aspectRatio;
      if (data.targetDuration !== undefined) updateData.targetDuration = data.targetDuration;
      if (data.language !== undefined) updateData.language = data.language;
      if (data.tone !== undefined) updateData.tone = data.tone;
      if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
      if (data.callToAction !== undefined) updateData.callToAction = data.callToAction;
      if (data.brandKitId !== undefined) updateData.brandKitId = data.brandKitId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, projectId));

      // Create new version if prompt or major fields changed
      if (data.prompt !== undefined || data.title !== undefined) {
        await db.insert(projects).values({
          ...project,
          id: crypto.randomUUID(),
          title: `${data.title || project.title} (v${project.currentVersion + 1})`,
          prompt: data.prompt || project.prompt,
          currentVersion: project.currentVersion + 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await db
          .update(projects)
          .set({ currentVersion: project.currentVersion + 1 })
          .where(eq(projects.id, projectId));
      }

      const updated = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      return c.json(createSuccessResponse({
        ...updated!,
        metadata: updated!.metadata ? (typeof updated!.metadata === 'string' ? JSON.parse(updated!.metadata) : updated!.metadata) : null,
      }, requestId));
    } catch (error) {
      console.error(`[Projects] Update error:`, error);
      return c.json(createErrorResponse(500, "Failed to update project", undefined, requestId), 500);
    }
  }
);

/**
 * DELETE /api/v1/projects/:projectId
 * Delete a project (soft delete by archiving)
 */
app.delete("/:projectId",
  requireAuth(),
  zValidator("param", ProjectIdParamSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { projectId } = c.req.valid("param");
    const requestId = c.get("requestId");

    try {
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .get();

      if (!project) {
        return c.json(createErrorResponse(404, "Project not found", undefined, requestId), 404);
      }

      // Soft delete - archive the project
      await db
        .update(projects)
        .set({ 
          status: "archived",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      return c.json(createSuccessResponse({
        message: "Project archived successfully",
        projectId,
      }, requestId));
    } catch (error) {
      console.error(`[Projects] Delete error:`, error);
      return c.json(createErrorResponse(500, "Failed to delete project", undefined, requestId), 500);
    }
  }
);

/**
 * POST /api/v1/projects/:projectId/duplicate
 * Duplicate a project
 */
app.post("/:projectId/duplicate",
  requireAuth(),
  zValidator("param", ProjectIdParamSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { projectId } = c.req.valid("param");
    const requestId = c.get("requestId");

    try {
      const project = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .get();

      if (!project) {
        return c.json(createErrorResponse(404, "Project not found", undefined, requestId), 404);
      }

      const newProjectId = crypto.randomUUID();
      const now = new Date();

      const duplicatedProject = {
        id: newProjectId,
        userId,
        organizationId: project.organizationId,
        title: `${project.title} (Copy)`,
        description: project.description,
        prompt: project.prompt,
        platform: project.platform,
        aspectRatio: project.aspectRatio,
        targetDuration: project.targetDuration,
        language: project.language,
        tone: project.tone,
        targetAudience: project.targetAudience,
        callToAction: project.callToAction,
        brandKitId: project.brandKitId,
        status: "draft" as const,
        currentVersion: 1,
        metadata: project.metadata,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(projects).values(duplicatedProject);

      return c.json(createSuccessResponse({
        ...duplicatedProject,
        metadata: duplicatedProject.metadata ? (typeof duplicatedProject.metadata === 'string' ? JSON.parse(duplicatedProject.metadata) : duplicatedProject.metadata) : null,
      }, requestId), 201);
    } catch (error) {
      console.error(`[Projects] Duplicate error:`, error);
      return c.json(createErrorResponse(500, "Failed to duplicate project", undefined, requestId), 500);
    }
  }
);

// Export Hono app for mounting
export { app as projectsApp };

// Next.js App Router Handler
import { handle } from "hono/vercel";

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

// Type exports for client
export type ProjectsAppType = typeof app;
