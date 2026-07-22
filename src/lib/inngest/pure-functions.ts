// Pure functions extracted from Inngest functions for unit testing
// These have no external dependencies (no DB, no API calls, no Inngest runtime)

import type { ScriptScene, ScriptContent, StoryboardFrame } from "@/lib/types/video";

// ============================================================================
// Type Guards & Validation
// ============================================================================

export function validateScriptContent(data: unknown): data is ScriptContent {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  
  if (!Array.isArray(obj.scenes)) return false;
  if (typeof obj.totalDuration !== "number") return false;
  if (typeof obj.wordCount !== "number") return false;
  
  for (const scene of obj.scenes) {
    if (!scene || typeof scene !== "object") return false;
    const s = scene as Record<string, unknown>;
    if (typeof s.id !== "string") return false;
    if (typeof s.order !== "number") return false;
    if (typeof s.heading !== "string") return false;
    if (typeof s.narration !== "string") return false;
    if (typeof s.visualDescription !== "string") return false;
    if (typeof s.duration !== "number" || s.duration <= 0) return false;
    if (s.cameraAngle !== undefined && typeof s.cameraAngle !== "string") return false;
    if (s.animation !== undefined && typeof s.animation !== "string") return false;
    if (s.transition !== undefined && typeof s.transition !== "string") return false;
  }
  
  return true;
}

// ============================================================================
// Pure Calculation Functions
// ============================================================================

export function calculateTotalDuration(scenes: ScriptScene[]): number {
  return scenes.reduce((acc, scene) => acc + scene.duration, 0);
}

export function calculateWordCount(scenes: ScriptScene[]): number {
  return scenes.reduce((acc, scene) => 
    acc + scene.narration.split(/\s+/).filter(w => w.length > 0).length, 0
  );
}

export function getAspectRatioForPlatform(platform: string): "16:9" | "9:16" | "1:1" | "4:5" | "21:9" {
  const aspectRatioMap: Record<string, "16:9" | "9:16" | "1:1" | "4:5" | "21:9"> = {
    youtube: "16:9",
    tiktok: "9:16",
    instagram: "9:16",
    linkedin: "16:9",
    twitter: "16:9",
    facebook: "16:9",
  };
  return aspectRatioMap[platform] || "16:9";
}

// ============================================================================
// Prompt Generation Functions
// ============================================================================

export function generateScriptSystemPrompt(params: {
  platform: string;
  duration: number;
  tone: string;
  style: string;
  language: string;
}): string {
  return `You are an expert video scriptwriter. Create engaging, platform-optimized video scripts.
Platform: ${params.platform}
Duration: ${params.duration} seconds
Tone: ${params.tone}
Style: ${params.style}
Language: ${params.language}

Return a JSON object with:
{
  "scenes": [
    {
      "id": "scene-1",
      "order": 1,
      "heading": "Hook",
      "narration": "Hook text here...",
      "visualDescription": "Visual description for AI image generation",
      "duration": 5,
      "cameraAngle": "close-up",
      "animation": "zoom-in",
      "transition": "cut"
    }
  ],
  "totalDuration": ${params.duration},
  "wordCount": 150
}`;
}

export function generateScriptUserPrompt(prompt: string, duration: number, platform: string): string {
  return `Create a ${duration}-second ${platform} video script about: ${prompt}`;
}

// ============================================================================
// Response Parsing
// ============================================================================

export function parseScriptResponse(response: string): ScriptContent {
  try {
    const parsed = JSON.parse(response);
    if (validateScriptContent(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to fallback
  }
  
  // Fallback: create minimal valid script from raw text
  const words = response.split(/\s+/).filter(w => w.length > 0);
  return {
    scenes: [{
      id: "scene-1",
      order: 1,
      heading: "Main Content",
      narration: response,
      visualDescription: response,
      duration: 60,
      cameraAngle: "wide",
      animation: "none",
      transition: "cut",
    }],
    totalDuration: 60,
    wordCount: words.length,
  };
}

// ============================================================================
// Storyboard Frame Generation
// ============================================================================

export function generateStoryboardFrames(
  scriptContent: ScriptContent,
  overallStyle: string,
  styleReference?: string
): Omit<StoryboardFrame, "id" | "status" | "imageUrl" | "thumbnailUrl">[] {
  return scriptContent.scenes.map((scene) => {
    const prompt = `${scene.visualDescription}, ${overallStyle} style, ${styleReference ? `reference: ${styleReference}` : ""}, high quality, detailed`;
    
    return {
      sceneId: scene.id,
      order: scene.order,
      prompt,
      duration: scene.duration,
      cameraAngle: scene.cameraAngle || "wide",
      animation: scene.animation || "none",
      transition: scene.transition || "cut",
      style: overallStyle,
      aspectRatio: "16:9",
      negativePrompt: "blurry, low quality, distorted, ugly, bad anatomy",
    };
  });
}