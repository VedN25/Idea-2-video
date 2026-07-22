import { env } from "@/lib/env";

// ============================================================================
// Runware Client (AI Image/Video Generation)
// ============================================================================

interface GenerateImageRequest {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:5" | "21:9";
  style?: string;
  steps?: number;
  cfgScale?: number;
  negativePrompt?: string;
  seed?: number;
  model?: string;
}

interface GenerateImageResponse {
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  seed: number;
}

interface GenerateVideoRequest {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: number; // seconds
  fps?: number;
  model?: string;
}

interface GenerateVideoResponse {
  videoUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
}

class RunwareClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.RUNWARE_API_KEY || "";
    this.baseUrl = "https://api.runware.ai/v1";
  }

  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
    const {
      prompt,
      aspectRatio = "16:9",
      style = "cinematic",
      steps = 30,
      cfgScale = 7,
      negativePrompt = "blurry, low quality, distorted, ugly, bad anatomy",
      seed,
      model = "runware:100@1",
    } = request;

    // Map aspect ratio to dimensions
    const dimensions = this.getDimensions(aspectRatio);

    const response = await fetch(`${this.baseUrl}/image/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: `${prompt}, ${style} style, high quality, detailed`,
        negativePrompt,
        width: dimensions.width,
        height: dimensions.height,
        steps,
        CFGScale: cfgScale,
        seed: seed || Math.floor(Math.random() * 1000000),
        model,
        numberResults: 1,
        outputFormat: "PNG",
        outputQuality: 95,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runware API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Runware returns base64 or URL depending on config
    const imageData = data.data?.[0];
    if (!imageData) throw new Error("No image generated");

    return {
      imageUrl: imageData.imageURL || `data:image/png;base64,${imageData.imageBase64}`,
      thumbnailUrl: imageData.thumbnailURL || `data:image/png;base64,${imageData.imageBase64}`,
      width: dimensions.width,
      height: dimensions.height,
      seed: imageData.seed || seed || 0,
    };
  }

  async generateVideo(request: GenerateVideoRequest): Promise<GenerateVideoResponse> {
    const {
      prompt,
      aspectRatio = "16:9",
      duration = 5,
      fps = 24,
      model = "runware:101@1",
    } = request;

    const dimensions = this.getDimensions(aspectRatio);

    const response = await fetch(`${this.baseUrl}/video/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskType: "videoInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: prompt,
        width: dimensions.width,
        height: dimensions.height,
        duration,
        fps,
        model,
        numberResults: 1,
        outputFormat: "MP4",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runware video API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const videoData = data.data?.[0];
    if (!videoData) throw new Error("No video generated");

    return {
      videoUrl: videoData.videoURL,
      thumbnailUrl: videoData.thumbnailURL,
      width: dimensions.width,
      height: dimensions.height,
      duration,
      fps,
    };
  }

  private getDimensions(aspectRatio: string): { width: number; height: number } {
    const baseWidth = 1920;
    switch (aspectRatio) {
      case "16:9":
        return { width: baseWidth, height: 1080 };
      case "9:16":
        return { width: 1080, height: 1920 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "4:5":
        return { width: 1080, height: 1350 };
      case "21:9":
        return { width: 1920, height: 822 };
      default:
        return { width: baseWidth, height: 1080 };
    }
  }
}

export const runware = new RunwareClient();