import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  auth: () => Promise.resolve({ userId: "test-user", orgId: "test-org" }),
  currentUser: () => Promise.resolve({ id: "test-user", emailAddresses: [{ emailAddress: "test@test.com" }] }),
}));

// Mock environment
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    OPENROUTER_API_KEY: "test-key",
    RUNWARE_API_KEY: "test-key",
    ELEVENLABS_API_KEY: "test-key",
    TURSO_DATABASE_URL: "file:test.db",
    TURSO_AUTH_TOKEN: "",
  },
}));

// Mock Remotion hooks (they throw outside Remotion context)
vi.mock("remotion", () => ({
  useVideoConfig: () => ({ fps: 30, durationInFrames: 1800, width: 1920, height: 1080 }),
  useCurrentFrame: () => 0,
  interpolate: (frame: number, input: number[], output: number[]) => output[0],
  spring: vi.fn(),
  Easing: {},
  AbsoluteFill: ({ children }: any) => children,
  Sequence: ({ children, from, durationInFrames }: any) => children,
}));

// Mock fetch globally
global.fetch = vi.fn();