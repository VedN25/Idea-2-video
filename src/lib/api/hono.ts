import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { env } from "@/lib/env";
import { verifyClerkToken, extractTokenFromHeader } from "@/lib/auth/clerk";

/**
 * Base Hono App Configuration
 * 
 * Provides a configured Hono instance with:
 * - CORS for cross-origin requests
 * - Request logging (dev only)
 * - Pretty JSON responses (dev only)
 * - Global error handling
 * - Clerk authentication middleware
 * - Zod validation middleware
 */

export function createApp() {
  const app = new Hono<{
    Variables: {
      requestId: string;
      userId: string;
      orgId: string | null;
      userRole: string;
      user?: any;
    };
  }>();

  // Global middleware
  app.use("*", logger());
  app.use("*", prettyJSON());
  
  // CORS configuration
  app.use("*", cors({
    origin: env.CORS_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
    maxAge: 86400,
  }));

  // Global error handler
  app.onError((err, c) => {
    const requestId = c.get("requestId") || crypto.randomUUID();
    
    console.error(`[API Error] ${requestId}:`, err);

    if (err instanceof HTTPException) {
      return c.json({
        error: {
          code: err.status,
          message: err.message,
          requestId,
        },
      }, err.status);
    }

    if (err instanceof z.ZodError) {
      return c.json({
        error: {
          code: 400,
          message: "Validation error",
          details: err.issues.map(e => ({
            field: e.path.join("."),
            message: e.message,
          })),
          requestId,
        },
      }, 400);
    }

    return c.json({
      error: {
        code: 500,
        message: env.NODE_ENV === "production" 
          ? "Internal server error" 
          : err.message,
        requestId,
      },
    }, 500);
  });

  // Request ID middleware
  app.use("*", async (c, next) => {
    const requestId = c.req.header("X-Request-Id") || crypto.randomUUID();
    c.set("requestId", requestId);
    c.res.headers.set("X-Request-Id", requestId);
    await next();
  });

  // Clerk authentication middleware
  app.use("/api/*", async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      throw new HTTPException(401, { message: "Unauthorized - No token provided" });
    }

    const payload = await verifyClerkToken(token);
    
    if (!payload?.userId) {
      throw new HTTPException(401, { message: "Unauthorized - Invalid token" });
    }

    c.set("userId", payload.userId);
    c.set("orgId", payload.orgId || null);
    c.set("userRole", (payload.sessionClaims?.metadata?.role as string) || "user");
    
    await next();
  });

  // Health check (no auth required)
  app.get("/health", (c) => {
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: env.APP_VERSION || "1.0.0",
      environment: env.NODE_ENV,
    });
  });

  return app;
}

/**
 * Type-safe route builder with Zod validation
 */
export function createRoute<
  TSchema extends z.ZodSchema,
  TResponse extends z.ZodSchema
>(options: {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  schema: TSchema;
  responseSchema?: TResponse;
  handler: (c: any, data: z.infer<TSchema>) => Promise<z.infer<TResponse> | Response>;
}) {
  return {
    method: options.method,
    path: options.path,
    schema: options.schema,
    responseSchema: options.responseSchema,
    handler: options.handler,
  };
}

/**
 * Standard API response schemas
 */
export const ApiResponseSchema = <T extends z.ZodSchema>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.number(),
      message: z.string(),
      details: z.array(z.any()).optional(),
      requestId: z.string(),
    }).optional(),
    meta: z.object({
      timestamp: z.string(),
      requestId: z.string(),
      version: z.string().optional(),
    }).optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodSchema>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  });

/**
 * Common query parameter schemas
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const IdParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const ProjectIdParamSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

export const VideoIdParamSchema = z.object({
  videoId: z.string().min(1, "Video ID is required"),
});

/**
 * Error response helpers
 */
export function createErrorResponse(
  code: number,
  message: string,
  details?: any[],
  requestId?: string
) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
  meta?: Record<string, any>
) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      ...meta,
    },
  };
}

/**
 * Pagination helpers
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getPaginationParams(c: any) {
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20")));
  const sort = c.req.query("sort");
  const order = (c.req.query("order") as "asc" | "desc") || "desc";
  return { page, limit, sort, order };
}

/**
 * Require authentication middleware
 */
export function requireAuth() {
  return async (c: any, next: any) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json(createErrorResponse(
        401,
        "Authentication required",
        undefined,
        c.get("requestId")
      ), 401);
    }
    await next();
  };
}

/**
 * Require organization membership
 */
export function requireOrg() {
  return async (c: any, next: any) => {
    const orgId = c.get("orgId");
    if (!orgId) {
      return c.json(createErrorResponse(
        403,
        "Organization membership required",
        undefined,
        c.get("requestId")
      ), 403);
    }
    await next();
  };
}

/**
 * Require specific role
 */
export function requireRole(...roles: string[]) {
  return async (c: any, next: any) => {
    const userRole = c.get("userRole");
    if (!userRole || !roles.includes(userRole)) {
      return c.json(createErrorResponse(
        403,
        "Insufficient permissions",
        undefined,
        c.get("requestId")
      ), 403);
    }
    await next();
  };
}
