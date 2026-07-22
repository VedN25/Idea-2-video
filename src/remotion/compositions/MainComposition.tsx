import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig, interpolate, spring, Easing } from "remotion";
import { ScriptContent, StoryboardFrame, ProjectSettings } from "@/lib/types/video";
import { Scene } from "./Scene";
import { AudioTrack } from "./AudioTrack";
import { TextOverlay } from "./TextOverlay";
import { Transition } from "./Transition";

interface MainCompositionProps {
  script?: ScriptContent;
  frames?: StoryboardFrame[];
  audioAssets?: Array<{ id: string; url: string; sceneId: string; duration: number }>;
  projectSettings?: ProjectSettings;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
  script = {
    scenes: [],
    totalDuration: 60,
    wordCount: 0,
  },
  frames = [],
  audioAssets = [],
  projectSettings = {
    platform: "youtube",
    aspectRatio: "16:9",
    targetDuration: 60,
    language: "en",
    tone: "engaging",
  },
}) => {
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const totalDuration = script.totalDuration;
  const totalFrames = totalDuration * fps;

  // Calculate scene timings
  const sceneTimings = script.scenes.map((scene, index) => {
    const startFrame = script.scenes
      .slice(0, index)
      .reduce((acc, s) => acc + s.duration * fps, 0);
    const endFrame = startFrame + scene.duration * fps;
    return { scene, startFrame, endFrame, index };
  });

  return (
    <AbsoluteFill style={{ width, height, backgroundColor: "#000" }}>
      {/* Background music track */}
      <AudioTrack
        src={projectSettings.backgroundMusicUrl}
        startFrame={0}
        endFrame={totalFrames}
        volume={0.15}
        fadeIn={2 * fps}
        fadeOut={2 * fps}
      />

      {/* Scenes */}
      {sceneTimings.map(({ scene, startFrame, endFrame, index }) => {
        const frame = frames.find((f) => f.sceneId === scene.id);
        const audioAsset = audioAssets.find((a) => a.sceneId === scene.id);
        const isLastScene = index === sceneTimings.length - 1;
        const nextFrame = frames[index + 1];

        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={scene.duration * fps}
            name={scene.heading}
          >
            <Scene
              scene={scene}
              frame={frame}
              audioAsset={audioAsset}
              projectSettings={projectSettings}
              width={width}
              height={height}
              fps={fps}
            />

            {/* Transition to next scene */}
            {!isLastScene && nextFrame && (
              <Transition
                fromFrame={frame}
                toFrame={nextFrame}
                type={scene.transition as any}
                duration={1 * fps}
                startFrame={endFrame - 1 * fps}
              />
            )}
          </Sequence>
        );
      })}

      {/* Global text overlays (titles, subtitles, CTAs) */}
      {script.scenes.map((scene, index) => {
        const { startFrame } = sceneTimings[index];
        return (
          <Sequence key={`overlay-${scene.id}`} from={startFrame} durationInFrames={scene.duration * fps}>
            <TextOverlay
              scene={scene}
              projectSettings={projectSettings}
              width={width}
              height={height}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MainCompositionMetadata = {
  id: "MainComposition",
  component: MainComposition,
  defaultProps: {
    script: {
      scenes: [],
      totalDuration: 60,
      wordCount: 0,
    },
    frames: [],
    audioAssets: [],
    projectSettings: {
      platform: "youtube",
      aspectRatio: "16:9",
      targetDuration: 60,
      language: "en",
      tone: "engaging",
    },
  },
};