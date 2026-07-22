import { env } from "@/lib/env";

// ============================================================================
// ElevenLabs Client
// ============================================================================

interface TextToSpeechRequest {
  text: string;
  voiceId: string;
  model?: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

interface TextToSpeechResponse {
  audioUrl: string;
  size: number;
  duration: number;
}

interface Voice {
  voiceId: string;
  name: string;
  category: string;
  description: string;
  labels: Record<string, string>;
  previewUrl: string;
}

interface VoicesResponse {
  voices: Voice[];
}

class ElevenLabsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.ELEVENLABS_API_KEY || "";
    this.baseUrl = "https://api.elevenlabs.io/v1";
  }

  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    const { text, voiceId, model = "eleven_multilingual_v2", voiceSettings } = request;

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    // In production, upload to storage and return URL
    // For now, return a placeholder
    const audioBuffer = await response.arrayBuffer();
    
    return {
      audioUrl: `https://storage.example.com/audio/${crypto.randomUUID()}.mp3`,
      size: audioBuffer.byteLength,
      duration: Math.ceil(text.length / 15), // Rough estimate: 15 chars per second
    };
  }

  async getVoices(): Promise<VoicesResponse> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    return response.json();
  }

  async getVoice(voiceId: string): Promise<Voice> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.status}`);
    }

    return response.json();
  }
}

export const elevenlabs = new ElevenLabsClient();