import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { ScriptScene, ProjectSettings } from "@/lib/types/video";

// Shared brand colors (would come from brand kit in real app)
export const defaultBrandColors = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  background: "rgba(0, 0, 0, 0.7)",
  text: "#ffffff",
  textOnPrimary: "#ffffff",
};

const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// Animation helpers (need frame and progress passed in)
const createFadeIn = (progress: number) => (delay = 0, duration = 0.5) => ({
  opacity: interpolate(progress, [delay, delay + duration], [0, 1]),
});

const createSlideUp = (progress: number) => (delay = 0, duration = 0.5, distance = 50) => ({
  opacity: interpolate(progress, [delay, delay + duration], [0, 1]),
  transform: `translateY(${interpolate(progress, [delay, delay + duration], [distance, 0])}px)`,
});

const createScaleIn = (progress: number) => (delay = 0, duration = 0.5) => ({
  opacity: interpolate(progress, [delay, delay + duration], [0, 1]),
  transform: `scale(${interpolate(progress, [delay, delay + duration], [0.8, 1])})`,
});

interface TextOverlayProps {
  scene: ScriptScene;
  projectSettings: ProjectSettings;
  width: number;
  height: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  scene,
  projectSettings,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const sceneDurationFrames = scene.duration * 30; // Assuming 30fps base
  const progress = frame / sceneDurationFrames;

  const fadeIn = createFadeIn(progress);
  const slideUp = createSlideUp(progress);
  const scaleIn = createScaleIn(progress);

  // Responsive font sizes based on platform and resolution
  const getFontSize = (baseSize: number) => {
    const scale = width / 1920;
    return Math.max(baseSize * scale, baseSize * 0.6);
  };

  // Scene heading/title
  const renderTitle = () => {
    if (!scene.heading) return null;

    const style: React.CSSProperties = {
      position: "absolute",
      top: height * 0.08,
      left: width * 0.1,
      right: width * 0.1,
      fontSize: getFontSize(48),
      fontWeight: 700,
      color: defaultBrandColors.text,
      textAlign: "center",
      textShadow: "0 4px 20px rgba(0,0,0,0.5)",
      fontFamily,
      lineHeight: 1.2,
      zIndex: 10,
      ...slideUp(0.1, 0.6, 30),
    };

    return <div style={style}>{scene.heading}</div>;
  };

  // Scene narration/subtitle
  const renderNarration = () => {
    if (!scene.narration) return null;

    const style: React.CSSProperties = {
      position: "absolute",
      bottom: height * 0.15,
      left: width * 0.1,
      right: width * 0.1,
      fontSize: getFontSize(24),
      fontWeight: 400,
      color: defaultBrandColors.text,
      textAlign: "center",
      textShadow: "0 2px 10px rgba(0,0,0,0.5)",
      fontFamily,
      lineHeight: 1.5,
      zIndex: 10,
      maxWidth: width * 0.8,
      margin: "0 auto",
      ...fadeIn(0.3, 0.5),
    };

    return <div style={style}>{scene.narration}</div>;
  };

  // Call to action (if last scene or specified)
  const renderCTA = () => {
    const cta = projectSettings.callToAction;
    if (!cta) return null;

    const style: React.CSSProperties = {
      position: "absolute",
      bottom: height * 0.08,
      left: width * 0.25,
      right: width * 0.25,
      fontSize: getFontSize(20),
      fontWeight: 600,
      color: defaultBrandColors.accent,
      textAlign: "center",
      textShadow: "0 2px 10px rgba(0,0,0,0.5)",
      fontFamily,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: "12px 24px",
      borderRadius: 50,
      border: `2px solid ${defaultBrandColors.accent}`,
      zIndex: 10,
      ...scaleIn(0.5, 0.5),
    };

    return <div style={style}>{cta}</div>;
  };

  // Platform-specific watermark/handle
  const renderWatermark = () => {
    const handle = projectSettings.targetAudience; // Using as placeholder for handle
    if (!handle) return null;

    const style: React.CSSProperties = {
      position: "absolute",
      bottom: height * 0.03,
      right: width * 0.03,
      fontSize: getFontSize(14),
      fontWeight: 500,
      color: "rgba(255,255,255,0.6)",
      fontFamily,
      zIndex: 5,
      ...fadeIn(0, 1),
    };

    return <div style={style}>@{handle}</div>;
  };

  // Progress bar for short-form content
  const renderProgressBar = () => {
    if (projectSettings.aspectRatio !== "9:16") return null;

    const style: React.CSSProperties = {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
      zIndex: 20,
    };

    const fillStyle: React.CSSProperties = {
      height: "100%",
      width: `${progress * 100}%`,
      backgroundColor: defaultBrandColors.primary,
      transition: "width 0.1s linear",
    };

    return (
      <div style={style}>
        <div style={fillStyle} />
      </div>
    );
  };

  return (
    <AbsoluteFill>
      {renderProgressBar()}
      {renderTitle()}
      {renderNarration()}
      {renderCTA()}
      {renderWatermark()}
    </AbsoluteFill>
  );
};

// Lower third component for names/titles
export const LowerThird: React.FC<{
  name: string;
  title: string;
  startFrame: number;
  endFrame: number;
  width: number;
  height: number;
  brandColors?: typeof defaultBrandColors;
}> = ({ name, title, startFrame, endFrame, width, height, brandColors: colors = defaultBrandColors }) => {
  const frame = useCurrentFrame();
  const isVisible = frame >= startFrame && frame < endFrame;
  const progress = (frame - startFrame) / (endFrame - startFrame);

  if (!isVisible) return null;

  const fadeIn = createFadeIn(progress);
  const slideUp = createSlideUp(progress);

  const style: React.CSSProperties = {
    position: "absolute",
    bottom: height * 0.2,
    left: width * 0.05,
    zIndex: 15,
    ...slideUp(0, 0.3, 30),
  };

  return (
    <div style={style}>
      <div
        style={{
          fontSize: Math.max(24 * (width / 1920), 16),
          fontWeight: 700,
          color: colors.text,
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: Math.max(16 * (width / 1920), 12),
          fontWeight: 400,
          color: colors.accent,
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          fontFamily: "'Inter', sans-serif",
          marginTop: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: 60,
          height: 3,
          backgroundColor: colors.primary,
          marginTop: 8,
          borderRadius: 2,
        }}
      />
    </div>
  );
};

// Animated counter/number component
export const AnimatedNumber: React.FC<{
  value: number;
  startFrame: number;
  endFrame: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  fontSize?: number;
  color?: string;
}> = ({ value, startFrame, endFrame, prefix = "", suffix = "", decimals = 0, fontSize = 48, color = "#fff" }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1]);
  const currentValue = value * progress;

  return (
    <div
      style={{
        fontSize,
        fontWeight: 700,
        color,
        fontFamily: "'Inter', sans-serif",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}{currentValue.toFixed(decimals)}{suffix}
    </div>
  );
};