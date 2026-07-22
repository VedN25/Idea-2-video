import { z } from "zod";

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Idea2Video"),
  APP_VERSION: z.string().default("1.0.0"),
  CORS_ORIGIN: z.string().default("*"),

  // Database (Turso)
  TURSO_DATABASE_URL: z.string().url().startsWith("libsql://"),
  TURSO_AUTH_TOKEN: z.string().min(1),

  // Authentication (Clerk)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),

  // AI Services
  OPENROUTER_API_KEY: z.string().startsWith("sk-or-").optional(),
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RUNWAY_API_KEY: z.string().optional(),
  LUMA_API_KEY: z.string().optional(),
  RUNWARE_API_KEY: z.string().optional(),

  // Background Jobs (Inngest)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Cache/Rate Limiting (Upstash Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Billing (Stripe)
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

  // Video Generation
  REMOTION_SERVE_URL: z.string().url().default("http://localhost:3000"),
  REMOTION_RENDER_URL: z.string().url().default("http://localhost:3000"),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_AI_VIDEO_GEN: z.string().transform(v => v === "true").default(() => true),
  NEXT_PUBLIC_ENABLE_COLLABORATION: z.string().transform(v => v === "true").default(() => false),
  NEXT_PUBLIC_ENABLE_BRAND_KIT: z.string().transform(v => v === "true").default(() => false),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check console for details.");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = getEnv();