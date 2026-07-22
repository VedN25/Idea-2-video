import { describe, it, expect } from "vitest";
import {
  validateScriptContent,
  calculateTotalDuration,
  calculateWordCount,
  getAspectRatioForPlatform,
  generateScriptSystemPrompt,
  generateScriptUserPrompt,
  parseScriptResponse,
  generateStoryboardFrames,
} from "../pure-functions";

import { ScriptScene, ScriptContent } from "@/lib/types/video";

const mockScene: ScriptScene = {
  id: "scene-1",
  order: 1,
  heading: "Introduction",
  narration: "Welcome to our video about AI agents.",
  visualDescription: "Animated AI agent working on a computer",
  duration: 10,
  cameraAngle: "close-up",
  animation: "zoom-in",
  transition: "cut",
};

const mockScriptContent: ScriptContent = {
  scenes: [mockScene, { ...mockScene, id: "scene-2", order: 2, duration: 15, narration: "Second scene content here." }],
  totalDuration: 25,
  wordCount: 15,
};

describe("Pure Functions - Validation", () => {
  it("validates correct ScriptContent", () => {
    expect(validateScriptContent(mockScriptContent)).toBe(true);
  });

  it("rejects missing scenes array", () => {
    expect(validateScriptContent({ totalDuration: 10, wordCount: 5 } as any)).toBe(false);
  });

  it("rejects invalid scene structure", () => {
    expect(validateScriptContent({ scenes: [{ id: 123 }], totalDuration: 10, wordCount: 5 } as any)).toBe(false);
  });

  it("rejects negative duration", () => {
    expect(validateScriptContent({ scenes: [{ ...mockScene, duration: -5 }], totalDuration: 10, wordCount: 5 } as any)).toBe(false);
  });
});

describe("Pure Functions - Calculations", () => {
  it("calculates total duration from scenes", () => {
    expect(calculateTotalDuration(mockScriptContent.scenes)).toBe(25);
  });

  it("calculates word count from narration", () => {
    expect(calculateWordCount(mockScriptContent.scenes)).toBeGreaterThan(0);
  });

  it("returns 0 for empty scenes", () => {
    expect(calculateTotalDuration([])).toBe(0);
    expect(calculateWordCount([])).toBe(0);
  });
});

describe("Pure Functions - Platform Aspect Ratios", () => {
  it("returns 16:9 for youtube", () => {
    expect(getAspectRatioForPlatform("youtube")).toBe("16:9");
  });

  it("returns 9:16 for tiktok", () => {
    expect(getAspectRatioForPlatform("tiktok")).toBe("9:16");
  });

  it("returns 9:16 for instagram", () => {
    expect(getAspectRatioForPlatform("instagram")).toBe("9:16");
  });

  it("returns 16:9 for linkedin", () => {
    expect(getAspectRatioForPlatform("linkedin")).toBe("16:9");
  });

  it("defaults to 16:9 for unknown platform", () => {
    expect(getAspectRatioForPlatform("unknown")).toBe("16:9");
  });
});

describe("Pure Functions - Prompt Generation", () => {
  it("generates system prompt with all parameters", () => {
    const prompt = generateScriptSystemPrompt({
      platform: "youtube",
      duration: 60,
      tone: "engaging",
      style: "educational",
      language: "English",
    });
    expect(prompt).toContain("youtube");
    expect(prompt).toContain("60");
    expect(prompt).toContain("engaging");
    expect(prompt).toContain("educational");
    expect(prompt).toContain("English");
    expect(prompt).toContain("JSON");
  });

  it("generates user prompt with topic", () => {
    const prompt = generateScriptUserPrompt("AI agents", 30, "tiktok");
    expect(prompt).toContain("AI agents");
    expect(prompt).toContain("30");
    expect(prompt).toContain("tiktok");
  });
});

describe("Pure Functions - Response Parsing", () => {
  it("parses valid JSON response", () => {
    const jsonResponse = JSON.stringify(mockScriptContent);
    const result = parseScriptResponse(jsonResponse);
    expect(result).toEqual(mockScriptContent);
  });

  it("falls back for invalid JSON", () => {
    const result = parseScriptResponse("This is not JSON");
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].narration).toBe("This is not JSON");
    expect(result.totalDuration).toBe(60);
  });

  it("falls back for valid JSON but invalid structure", () => {
    const result = parseScriptResponse(JSON.stringify({ invalid: "structure" }));
    expect(result.scenes).toHaveLength(1);
  });
});

describe("Pure Functions - Storyboard Frame Generation", () => {
  it("generates frames from script content", () => {
    const frames = generateStoryboardFrames(mockScriptContent, "cinematic");
    expect(frames).toHaveLength(2);
    expect(frames[0].sceneId).toBe("scene-1");
    expect(frames[0].prompt).toContain("cinematic");
    expect(frames[0].duration).toBe(10);
    expect(frames[0].cameraAngle).toBe("close-up");
    expect(frames[0].animation).toBe("zoom-in");
    expect(frames[0].transition).toBe("cut");
    expect(frames[0].style).toBe("cinematic");
    expect(frames[0].aspectRatio).toBe("16:9");
    expect(frames[0].negativePrompt).toContain("blurry");
  });

  it("includes style reference when provided", () => {
    const frames = generateStoryboardFrames(mockScriptContent, "anime", "https://example.com/ref.jpg");
    expect(frames[0].prompt).toContain("reference: https://example.com/ref.jpg");
  });

  it("uses defaults for missing optional scene fields", () => {
    const minimalScene: ScriptScene = {
      id: "scene-1",
      order: 1,
      heading: "Test",
      narration: "Test narration",
      visualDescription: "Test visual",
      duration: 5,
    };
    const minimalScript: ScriptContent = { scenes: [minimalScene], totalDuration: 5, wordCount: 5 };
    const frames = generateStoryboardFrames(minimalScript, "minimal");
    expect(frames[0].cameraAngle).toBe("wide");
    expect(frames[0].animation).toBe("none");
    expect(frames[0].transition).toBe("cut");
  });
});