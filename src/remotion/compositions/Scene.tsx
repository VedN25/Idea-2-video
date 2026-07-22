import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Easing } from "remotion";
import { ScriptScene, StoryboardFrame, ProjectSettings } from "@/lib/types/video";

interface SceneProps {
  scene: ScriptScene;
  frame?: StoryboardFrame;
  audioAsset?: { id: string; url: string; duration: number } | null;
  projectSettings: ProjectSettings;
  width: number;
  height: number;
  fps: number;
}

export const Scene: React.FC<SceneProps> = ({
  scene,
  frame,
  audioAsset,
  projectSettings,
  width,
  height,
  fps,
}) => {
  const currentFrame = useCurrentFrame();
  const sceneDurationFrames = scene.duration * fps;
  const progress = currentFrame / sceneDurationFrames;

  // Animation styles based on scene.animation
  const getAnimationStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      position: "absolute",
      top: 0,
      left: 0,
    };

    switch (scene.animation) {
      case "zoom-in":
        return {
          ...baseStyle,
          transform: `scale(${interpolate(progress, [0, 1], [1, 1.15])})`,
        };
      case "zoom-out":
        return {
          ...baseStyle,
          transform: `scale(${interpolate(progress, [0, 1], [1.15, 1])})`,
        };
      case "pan-left":
        return {
          ...baseStyle,
          transform: `translateX(${interpolate(progress, [0, 1], [0, -width * 0.1])}px)`,
        };
      case "pan-right":
        return {
          ...baseStyle,
          transform: `translateX(${interpolate(progress, [0, 1], [width * 0.1, 0])}px)`,
        };
      case "pan-up":
        return {
          ...baseStyle,
          transform: `translateY(${interpolate(progress, [0, 1], [height * 0.1, 0])}px)`,
        };
      case "pan-down":
        return {
          ...baseStyle,
          transform: `translateY(${interpolate(progress, [0, 1], [0, -height * 0.1])}px)`,
        };
      case "ken-burns":
        return {
          ...baseStyle,
          transform: `scale(${interpolate(progress, [0, 1], [1, 1.2])}) translateX(${interpolate(progress, [0, 1], [0, -width * 0.05])}px)`,
        };
      case "fade-in":
        return {
          ...baseStyle,
          opacity: interpolate(progress, [0, 0.3], [0, 1]),
        };
      case "slide-up":
        return {
          ...baseStyle,
          transform: `translateY(${interpolate(progress, [0, 0.5], [height * 0.1, 0])}px)`,
          opacity: interpolate(progress, [0, 0.5], [0, 1]),
        };
      default:
        return baseStyle;
    }
  };

  // Camera angle effects
  const getCameraAngleStyle = () => {
    switch (scene.cameraAngle) {
      case "close-up":
        return { transform: "scale(1.3)" };
      case "extreme-close-up":
        return { transform: "scale(1.6)" };
      case "wide":
        return { transform: "scale(0.8)" };
      case "low-angle":
        return { transform: "perspective(1000px) rotateX(10deg) scale(1.1)" };
      case "high-angle":
        return { transform: "perspective(1000px) rotateX(-10deg) scale(1.1)" };
      case "dutch-angle":
        return { transform: "rotate(5deg) scale(1.1)" };
      case "aerial":
        return { transform: "scale(0.7)" };
      default:
        return {};
    }
  };

  const animationStyle = getAnimationStyle();
  const cameraStyle = getCameraAngleStyle();

  // Combine styles
  const combinedStyle: React.CSSProperties = {
    ...animationStyle,
    transform: `${animationStyle.transform || ""} ${cameraStyle.transform || ""}`.trim(),
  };

  // Render visual content
  const renderVisual = () => {
    if (frame?.imageUrl) {
      return (
        <img
          src={frame.imageUrl}
          alt={scene.visualDescription}
          style={combinedStyle}
        />
      );
    }

    if (frame?.videoUrl) {
      return (
        <video
          src={frame.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          style={combinedStyle}
        />
      );
    }

    // Placeholder gradient based on style
    const gradients: Record<string, string> = {
      cinematic: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      documentary: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
      educational: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
      marketing: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
      anime: "linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)",
      pixar: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
      minimal: "linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%)",
      dark: "linear-gradient(135deg, #111 0%, #222 100%)",
      vibrant: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
      pastel: "linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)",
    };

    const gradient = gradients[frame?.style || "cinematic"] || gradients.cinematic;

    return (
      <AbsoluteFill
        style={{
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: 40, color: "white", opacity: 0.7 }}>
          <h3 style={{ fontSize: 24, marginBottom: 16 }}>{scene.heading}</h3>
          <p style={{ fontSize: 16, maxWidth: 400 }}>{scene.visualDescription}</p>
        </div>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {renderVisual()}

      {/* Scene narration as audio - handled by AudioTrack component */}
      {audioAsset && (
        <audio
          src={audioAsset.url}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />
      )}
    </AbsoluteFill>
  );
};