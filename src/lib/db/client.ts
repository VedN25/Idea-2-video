import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { env } from "@/lib/env";

/**
 * Turso (libSQL) Database Client Singleton
 * 
 * This module provides a singleton database connection for the entire application.
 * Uses libSQL HTTP client for Turso with connection pooling via fetch.
 * 
 * Why libSQL HTTP over WebSocket?
 * - Works in serverless environments (Vercel, Cloudflare Workers)
 * - No persistent connection management needed
 * - Automatic retry and connection pooling via fetch
 * - Lower cold-start latency for serverless functions
 * 
 * Connection Pooling:
 * - libSQL HTTP client uses fetch which is automatically pooled by the runtime
 * - For high-traffic apps, consider using a connection pooler like PgBouncer equivalent
 * - Turso handles connection scaling automatically
 */

// Global singleton to prevent multiple connections in development/hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  // eslint-disable-next-line no-var
  var __client: ReturnType<typeof createClient> | undefined;
}

/**
 * Creates the libSQL HTTP client
 * Uses environment variables for Turso connection
 */
function createLibSQLClient() {
  const url = env.TURSO_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Please add it to your .env file. " +
      "Get it from your Turso dashboard: https://turso.tech"
    );
  }

  return createClient({
    url,
    authToken, // Optional for local development, required for Turso cloud
    // Connection pool settings (handled by fetch automatically)
    // For explicit pooling, use: { url, authToken, maxSize: 10 }
  });
}

/**
 * Creates the Drizzle ORM instance with schema
 */
function createDrizzleInstance(client: ReturnType<typeof createClient>) {
  return drizzle(client, { schema, logger: env.NODE_ENV === "development" });
}

/**
 * Get or create the database singleton
 * In development, reuses global to survive hot reloads
 * In production, creates new instance per cold start (serverless-friendly)
 */
export function getDb() {
  if (env.NODE_ENV === "production") {
    // Production: fresh instance per invocation (serverless)
    const client = createLibSQLClient();
    return createDrizzleInstance(client);
  }

  // Development: reuse global singleton
  if (!global.__client) {
    global.__client = createLibSQLClient();
  }
  if (!global.__db) {
    global.__db = createDrizzleInstance(global.__client);
  }
  return global.__db;
}

/**
 * Database instance - use this throughout the application
 * 
 * Usage:
 * ```typescript
 * import { db } from "@/lib/db/client";
 * import { users } from "@/lib/db/schema";
 * 
 * const user = await db.select().from(users).where(eq(users.id, userId)).get();
 * ```
 */
export const db = getDb();

/**
 * Raw client for transactions or direct SQL execution
 * 
 * Usage:
 * ```typescript
 * import { client } from "@/lib/db/client";
 * 
 * await client.execute("PRAGMA foreign_keys = ON");
 * ```
 */
export const client = env.NODE_ENV === "production"
  ? createLibSQLClient()
  : (global.__client ??= createLibSQLClient());

/**
 * Type-safe transaction helper
 * 
 * Usage:
 * ```typescript
 * await db.transaction(async (tx) => {
 *   await tx.insert(users).values({ id: "1", email: "test@test.com" });
 *   await tx.insert(projects).values({ id: "1", userId: "1", title: "Test" });
 * });
 * ```
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Initialize database - run migrations, verify connection
 * Call this during app startup (e.g., in a middleware or API route)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await client.execute("SELECT 1");
    
    // Enable foreign keys (required for cascade deletes)
    await client.execute("PRAGMA foreign_keys = ON");
    
    // Enable WAL mode for better concurrency (libSQL specific)
    await client.execute("PRAGMA journal_mode = WAL");
    
    console.log("[DB] Database connection established successfully");
  } catch (error) {
    console.error("[DB] Failed to initialize database:", error);
    throw new Error("Database initialization failed. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
  }
}

/**
 * Close database connections (for graceful shutdown)
 * In serverless, this is rarely needed but useful for long-running processes
 */
export async function closeDatabase(): Promise<void> {
  if (global.__client) {
    await global.__client.close();
    global.__client = undefined;
    global.__db = undefined;
  }
}

/**
 * Health check for monitoring/load balancers
 */
export async function healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await client.execute("SELECT 1");
    return { healthy: true, latencyMs: Date.now() - start };
  } catch {
    return { healthy: false, latencyMs: Date.now() - start };
  }
}

// Export schema for convenience
export { schema };
export type { 
  User, NewUser,
  Organization, NewOrganization,
  OrganizationMember,
  Project, NewProject,
  ProjectVersion,
  Script, NewScript,
  Storyboard,
  Asset,
  Video,
  Scene,
  Voiceover,
  MusicTrack,
  BrandKit,
  Credit,
  Subscription,
  Notification,
  Template,
  Collaboration,
  Comment,
  Webhook,
  ApiKey,
} from "./schema";