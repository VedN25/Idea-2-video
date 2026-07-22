import { registerRoot } from "remotion";
import { MainComposition } from "./compositions/MainComposition";
import { Scene } from "./compositions/Scene";
import { AudioTrack, MultiTrackAudio } from "./compositions/AudioTrack";
import { TextOverlay, LowerThird, AnimatedNumber } from "./compositions/TextOverlay";
import { Transition, transitionPresets, getRandomTransition } from "./compositions/Transition";

// Register the main composition
registerRoot(MainComposition);

// Export all components for use in other compositions
export {
  MainComposition,
  Scene,
  AudioTrack,
  MultiTrackAudio,
  TextOverlay,
  LowerThird,
  AnimatedNumber,
  Transition,
  transitionPresets,
  getRandomTransition,
};

// Export types
export type { ScriptContent, StoryboardFrame, ProjectSettings, AudioAsset } from "@/lib/types/video";