import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { projects, scripts, storyboards, videos, assets, projectVersions, voiceovers, musicTracks, brandKits, credits, subscriptions, notifications, templates, collaborations, comments, webhooks, apiKeys } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

// ============================================================================
// Type Definitions
// ============================================================================

interface ScriptScene {
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

interface ScriptContent {
  scenes: ScriptScene[];
  totalDuration: number;
  wordCount: number;
}

interface StoryboardFrame {
  id: string;
  sceneId: string;
  order: number;
  prompt: string;
  duration: number;
  cameraAngle: string;
  animation: string;
  transition: string;
  style: string;
  aspectRatio: string;
  status: "pending" | "generating" | "completed" | "failed";
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface VideoRenderInput {
  videoId: string;
  projectId: string;
  composition: string;
  inputProps: {
    script: ScriptContent;
    frames: StoryboardFrame[];
    audioAssets: any[];
    projectSettings: any;
  };
  storyboardId?: string;
}

type InngestEvent<T = any> = { data: T; name: string; id: string; ts: number; v: string };
type InngestStep = any; // Inngest step type

// ============================================================================
// Helper Functions
// ============================================================================

async function callOpenRouter(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Idea2Video",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function callRunware(prompt: string, options?: {
  width?: number;
  height?: number;
  model?: string;
  steps?: number;
  cfgScale?: number;
}): Promise<string> {
  const response = await fetch("https://api.runware.ai/v1", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RUNWARE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{
      taskType: "imageInference",
      taskUUID: crypto.randomUUID(),
      positivePrompt: prompt,
      width: options?.width || 1024,
      height: options?.height || 576,
      model: options?.model || "runware:100@1",
      steps: options?.steps || 30,
      CFGScale: options?.cfgScale || 7,
      numberResults: 1,
    }]),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Runware API error: ${error}`);
  }

  const data = await response.json();
  return data.data?.[0]?.imageURL || "";
}

async function callElevenLabs(text: string, voiceId?: string): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || "21m00Tcm4TlvDq8ikWAM"}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Inngest v4 Function Helpers
// ============================================================================

// Inngest v4 uses createFunction with 2 args: config and handler
// Handler receives { event, step } as a single object

function createInngestFunction(
  config: { id: string; name: string; retries?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20; timeout?: string },
  eventName: string,
  handler: ({ event, step }: { event: InngestEvent; step: InngestStep }) => Promise<any>
) {
  // Inngest v4: createFunction(config, handler) - event is in config
  return inngest.createFunction(
    { ...config, triggers: [{ event: eventName }] },
    handler
  );
}

// ============================================================================
// Script Generation Function
// ============================================================================

export const generateScript = createInngestFunction(
  { id: "generate-script", name: "Generate Script", retries: 2 },
  "script/generate",
  async ({ event, step }) => {
    const { projectId, userId, prompt, duration, platform, tone, style, language } = event.data as {
      projectId: string;
      userId: string;
      prompt: string;
      duration?: number;
      platform?: string;
      tone?: string;
      style?: string;
      language?: string;
    };

    const project = await step.run("get-project", async () => {
      const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      return result[0];
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const systemPrompt = `You are an expert video scriptwriter. Create engaging, platform-optimized video scripts.
Platform: ${platform || "YouTube"}
Duration: ${duration || 60} seconds
Tone: ${tone || "engaging"}
Style: ${style || "educational"}
Language: ${language || "English"}

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
  "totalDuration": 60,
  "wordCount": 150
}`;

    const userPrompt = `Create a ${duration || 60}-second ${platform || "YouTube"} video script about: ${prompt}`;

    const scriptContent = await step.run("generate-script-content", async () => {
      const response = await callOpenRouter(userPrompt, systemPrompt);
      try {
        return JSON.parse(response) as ScriptContent;
      } catch {
        // Fallback if JSON parsing fails
        return {
          scenes: [{
            id: "scene-1",
            order: 1,
            heading: "Main Content",
            narration: response,
            visualDescription: prompt,
            duration: duration || 60,
            cameraAngle: "wide",
            animation: "none",
            transition: "cut",
          }],
          totalDuration: duration || 60,
          wordCount: response.split(" ").length,
        };
      }
    });

    const script = await step.run("save-script", async () => {
      const scriptId = generateId();
      await db.insert(scripts).values({
        id: scriptId,
        projectId,
        version: 1,
        content: scriptContent as any,
        status: "approved",
        metadata: {
          prompt,
          duration,
          platform,
          tone,
          style,
          language,
        } as any,
        generatedBy: "ai",
        promptUsed: prompt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id: scriptId, ...scriptContent };
    });

    // Create version snapshot
    await step.run("create-version", async () => {
      await db.insert(projectVersions).values({
        id: generateId(),
        projectId,
        version: project.currentVersion + 1,
        title: project.title,
        prompt: project.prompt,
        scriptId: script.id,
        changes: [{
          type: "script",
          description: "Generated script",
          newValue: scriptContent,
        }],
        createdBy: userId,
        createdAt: new Date(),
        message: "Generated script",
      });

      await db.update(projects)
        .set({ currentVersion: project.currentVersion + 1 })
        .where(eq(projects.id, projectId));
    });

    // Trigger storyboard generation automatically
    await step.sendEvent("trigger-storyboard", {
      name: "storyboard/generate",
      data: {
        scriptId: script.id,
        projectId,
        userId,
        overallStyle: style || "cinematic",
      },
    });

    return { script };
  }
);

// ============================================================================
// Storyboard Generation Function
// ============================================================================

export const generateStoryboard = createInngestFunction(
  { id: "generate-storyboard", name: "Generate Storyboard", retries: 2 },
  "storyboard/generate",
  async ({ event, step }) => {
    const { scriptId, projectId, userId, styleReference, overallStyle, model } = event.data as {
      scriptId: string;
      projectId: string;
      userId: string;
      styleReference?: string;
      overallStyle?: string;
      model?: string;
    };

    const script = await step.run("get-script", async () => {
      const result = await db.select().from(scripts).where(eq(scripts.id, scriptId)).limit(1);
      return result[0];
    });

    if (!script) {
      throw new Error("Script not found");
    }

    const scriptContent = script.content as ScriptContent;
    const frames: StoryboardFrame[] = [];

    for (const scene of scriptContent.scenes) {
      const frameId = generateId();
      const prompt = `${scene.visualDescription}, ${overallStyle || "cinematic"} style, ${styleReference ? `reference: ${styleReference}` : ""}, high quality, detailed`;

      frames.push({
        id: frameId,
        sceneId: scene.id,
        order: scene.order,
        prompt,
        duration: scene.duration,
        cameraAngle: scene.cameraAngle || "wide",
        animation: scene.animation || "none",
        transition: scene.transition || "cut",
        style: overallStyle || "cinematic",
        aspectRatio: "16:9",
        status: "pending",
      });
    }

    const storyboard = await step.run("save-storyboard", async () => {
      const storyboardId = generateId();
      await db.insert(storyboards).values({
        id: storyboardId,
        projectId,
        scriptId,
        version: 1,
        frames: frames as any,
        overallStyle: overallStyle || "cinematic",
        styleReference,
        status: "generating",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id: storyboardId, frames };
    });

    // Generate images for each frame in parallel batches
    const batchSize = 3;
    for (let i = 0; i < frames.length; i += batchSize) {
      const batch = frames.slice(i, i + batchSize);
      await Promise.all(batch.map(async (frame) => {
        await step.run(`generate-frame-${frame.id}`, async () => {
          try {
            const imageUrl = await callRunware(frame.prompt, {
              width: 1920,
              height: 1080,
              model: model || "runware:100@1",
            });

            // Update frame status
            const updatedFrames = storyboard.frames.map((f: any) =>
              f.id === frame.id ? { ...f, status: "completed", imageUrl } : f
            );

            await db.update(storyboards)
              .set({ frames: updatedFrames as any, updatedAt: new Date() })
              .where(eq(storyboards.id, storyboard.id));

            return { frameId: frame.id, imageUrl };
          } catch (error) {
            const updatedFrames = storyboard.frames.map((f: any) =>
              f.id === frame.id ? { ...f, status: "failed" } : f
            );
            await db.update(storyboards)
              .set({ frames: updatedFrames as any, updatedAt: new Date() })
              .where(eq(storyboards.id, storyboard.id));
            throw error;
          }
        });
      }));
    }

    // Mark storyboard as completed
    await step.run("complete-storyboard", async () => {
      await db.update(storyboards)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(storyboards.id, storyboard.id));
    });

    // Trigger voice generation
    await step.sendEvent("trigger-voice", {
      name: "voice/generate",
      data: {
        storyboardId: storyboard.id,
        scriptId,
        projectId,
        userId,
      },
    });

    return { storyboard };
  }
);

// ============================================================================
// Voice Generation Function
// ============================================================================

export const generateVoice = createInngestFunction(
  { id: "generate-voice", name: "Generate Voice", retries: 2 },
  "voice/generate",
  async ({ event, step }) => {
    const { storyboardId, scriptId, projectId, userId, voiceId } = event.data as {
      storyboardId: string;
      scriptId: string;
      projectId: string;
      userId: string;
      voiceId?: string;
    };

    const [script, storyboard] = await Promise.all([
      step.run("get-script", async () => {
        const result = await db.select().from(scripts).where(eq(scripts.id, scriptId)).limit(1);
        return result[0];
      }),
      step.run("get-storyboard", async () => {
        const result = await db.select().from(storyboards).where(eq(storyboards.id, storyboardId)).limit(1);
        return result[0];
      }),
    ]);

    if (!script || !storyboard) {
      throw new Error("Script or storyboard not found");
    }

    const scriptContent = script.content as ScriptContent;
    const frames = storyboard.frames as StoryboardFrame[];

    // Generate voice for each scene
    for (const scene of scriptContent.scenes) {
      await step.run(`generate-voice-${scene.id}`, async () => {
        const audioUrl = await callElevenLabs(scene.narration, voiceId);

        // Store as asset
        const assetId = generateId();
        await db.insert(assets).values({
          id: assetId,
          projectId,
          userId,
          type: "audio",
          name: `voiceover-${scene.id}.mp3`,
          url: audioUrl,
          mimeType: "audio/mpeg",
          source: "generated",
          generationPrompt: scene.narration,
          generationModel: "eleven_multilingual_v2",
          tags: ["voiceover", scene.id],
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { sceneId: scene.id, assetId, audioUrl };
      });
    }

    // Trigger video rendering
    await step.sendEvent("trigger-render", {
      name: "video/render",
      data: {
        storyboardId,
        scriptId,
        projectId,
        userId,
      },
    });

    return { success: true };
  }
);

// ============================================================================
// Video Rendering Function
// ============================================================================

export const renderVideo = createInngestFunction(
  { id: "render-video", name: "Render Video", retries: 1, timeout: "30m" },
  "video/render",
  async ({ event, step }) => {
    const { storyboardId, scriptId, projectId, userId, composition } = event.data as {
      storyboardId: string;
      scriptId: string;
      projectId: string;
      userId: string;
      composition?: string;
    };

    const [script, storyboard, project] = await Promise.all([
      step.run("get-script", async () => {
        const result = await db.select().from(scripts).where(eq(scripts.id, scriptId)).limit(1);
        return result[0];
      }),
      step.run("get-storyboard", async () => {
        const result = await db.select().from(storyboards).where(eq(storyboards.id, storyboardId)).limit(1);
        return result[0];
      }),
      step.run("get-project", async () => {
        const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
        return result[0];
      }),
    ]);

    if (!script || !storyboard || !project) {
      throw new Error("Missing required resources");
    }

    const videoId = generateId();
    const scriptContent = script.content as ScriptContent;
    const frames = storyboard.frames as StoryboardFrame[];

    // Get audio assets
    const audioAssets = await step.run("get-audio-assets", async () => {
      return db.select().from(assets)
        .where(and(eq(assets.projectId, projectId), eq(assets.type, "audio")));
    });

    // Create video record
    await step.run("create-video-record", async () => {
      await db.insert(videos).values({
        id: videoId,
        projectId,
        version: 1,
        status: "rendering",
        remotionComposition: composition || "MainComposition",
        inputProps: {
          script: scriptContent,
          frames,
          audioAssets,
          projectSettings: {
            platform: project.platform,
            aspectRatio: project.aspectRatio,
            targetDuration: project.targetDuration,
            language: project.language,
            tone: project.tone,
          },
        } as any,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: "h264",
        renderProgress: 0,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Trigger Remotion render via API
    const renderResult = await step.run("trigger-remotion-render", async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          composition: composition || "MainComposition",
          inputProps: {
            script: scriptContent,
            frames,
            audioAssets,
            projectSettings: {
              platform: project.platform,
              aspectRatio: project.aspectRatio,
              targetDuration: project.targetDuration,
              language: project.language,
              tone: project.tone,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Render API error: ${await response.text()}`);
      }

      return response.json();
    });

    // Poll for completion
    let renderStatus = "rendering";
    let attempts = 0;
    const maxAttempts = 180; // 30 minutes max

    while (renderStatus === "rendering" && attempts < maxAttempts) {
      await step.sleep(`wait-render-${attempts}`, 10000); // Wait 10 seconds

      const statusResult = await step.run(`check-render-status-${attempts}`, async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/render/${renderResult.renderId}`);
        return response.json();
      });

      renderStatus = statusResult.status;
      attempts++;

      // Update progress
      await step.run(`update-progress-${attempts}`, async () => {
        await db.update(videos)
          .set({
            renderProgress: statusResult.progress || Math.min(attempts * 2, 90),
            updatedAt: new Date(),
          })
          .where(eq(videos.id, videoId));
      });
    }

    if (renderStatus !== "completed") {
      await step.run("mark-failed", async () => {
        await db.update(videos)
          .set({ status: "failed", error: "Render timeout or failed", updatedAt: new Date() })
          .where(eq(videos.id, videoId));
      });
      throw new Error("Video render failed or timed out");
    }

    // Update video with final URL
    await step.run("complete-video", async () => {
      await db.update(videos)
        .set({
          status: "completed",
          outputUrl: renderResult.outputUrl,
          duration: scriptContent.totalDuration,
          renderProgress: 100,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoId));
    });

    // Create version snapshot
    await step.run("create-version", async () => {
      await db.insert(projectVersions).values({
        id: generateId(),
        projectId,
        version: project.currentVersion + 1,
        title: project.title,
        prompt: project.prompt,
        videoId,
        changes: [{
          type: "visual",
          description: "Rendered video",
          newValue: { videoId, url: renderResult.outputUrl },
        }],
        createdBy: userId,
        createdAt: new Date(),
        message: "Rendered video",
      });

      await db.update(projects)
        .set({ currentVersion: project.currentVersion + 1, status: "completed", completedAt: new Date() })
        .where(eq(projects.id, projectId));
    });

    // Trigger thumbnail generation
    await step.sendEvent("trigger-thumbnail", {
      name: "thumbnail/generate",
      data: {
        videoId,
        projectId,
        userId,
      },
    });

    return { videoId, url: renderResult.outputUrl };
  }
);

// ============================================================================
// Thumbnail Generation Function
// ============================================================================

export const generateThumbnail = createInngestFunction(
  { id: "generate-thumbnail", name: "Generate Thumbnail", retries: 2 },
  "thumbnail/generate",
  async ({ event, step }) => {
    const { videoId, projectId, userId } = event.data as {
      videoId: string;
      projectId: string;
      userId: string;
    };

    const video = await step.run("get-video", async () => {
      const result = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
      return result[0];
    });

    if (!video) {
      throw new Error("Video not found");
    }

    const inputProps = video.inputProps as { frames: StoryboardFrame[] };
    const frames = inputProps.frames as StoryboardFrame[];

    // Use first frame or a key frame for thumbnail
    const thumbnailFrame = frames[0];
    const prompt = `${thumbnailFrame?.prompt || "Video thumbnail"}, youtube thumbnail style, high contrast, vibrant colors, text space, professional`;

    const thumbnailUrl = await step.run("generate-thumbnail-image", async () => {
      return callRunware(prompt, {
        width: 1280,
        height: 720,
        model: "runware:100@1",
      });
    });

    // Update video with thumbnail
    await step.run("update-video-thumbnail", async () => {
      await db.update(videos)
        .set({ thumbnailUrl, updatedAt: new Date() })
        .where(eq(videos.id, videoId));
    });

    return { thumbnailUrl };
  }
);

// ============================================================================
// Project Creation Function
// ============================================================================

export const createProject = createInngestFunction(
  { id: "create-project", name: "Create Project", retries: 2 },
  "project/create",
  async ({ event, step }) => {
    const { userId, title, description, prompt, platform, duration, style, tone, language, brandKitId } = event.data as {
      userId: string;
      title: string;
      description?: string;
      prompt: string;
      platform?: string;
      duration?: number;
      style?: string;
      tone?: string;
      language?: string;
      brandKitId?: string;
    };

    const projectId = generateId();
    const aspectRatioMap: Record<string, string> = {
      youtube: "16:9",
      tiktok: "9:16",
      instagram: "9:16",
      linkedin: "16:9",
      twitter: "16:9",
      facebook: "16:9",
    };

    await step.run("create-project", async () => {
      await db.insert(projects).values({
        id: projectId,
        userId,
        title,
        description,
        prompt,
        platform: (platform as any) || "youtube",
        aspectRatio: (aspectRatioMap[platform || "youtube"] as any) || "16:9",
        targetDuration: duration || 60,
        language: language || "en",
        tone,
        brandKitId,
        status: "draft",
        currentVersion: 1,
        metadata: {
          style,
          tags: [],
        } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Trigger script generation
    await step.sendEvent("trigger-script", {
      name: "script/generate",
      data: {
        projectId,
        userId,
        prompt,
        duration: duration || 60,
        platform: platform || "youtube",
        tone,
        style,
        language: language || "en",
      },
    });

    return { projectId };
  }
);

// Export all functions
export const functions = [
  generateScript,
  generateStoryboard,
  generateVoice,
  renderVideo,
  generateThumbnail,
  createProject,
];