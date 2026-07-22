import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { StoryboardFrame } from "@/lib/types/video";

type TransitionType = 
  | "cut"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom"
  | "spin"
  | "flip"
  | "wipe-left"
  | "wipe-right"
  | "wipe-up"
  | "wipe-down"
  | "blur"
  | "glitch"
  | "morph";

interface TransitionProps {
  fromFrame?: StoryboardFrame;
  toFrame?: StoryboardFrame;
  type: TransitionType;
  duration: number;
  startFrame: number;
}

export const Transition: React.FC<TransitionProps> = ({
  fromFrame,
  toFrame,
  type,
  duration,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1]);
  const isActive = frame >= startFrame && frame < startFrame + duration;

  if (!isActive || !fromFrame || !toFrame) return null;

  const fromUrl = fromFrame.imageUrl || fromFrame.videoUrl;
  const toUrl = toFrame.imageUrl || toFrame.videoUrl;

  if (!fromUrl || !toUrl) return null;

  const renderTransition = () => {
    switch (type) {
      case "cut":
        return (
          <AbsoluteFill>
            <img src={toUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        );

      case "fade":
        return (
          <AbsoluteFill>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: interpolate(progress, [0, 1], [1, 0]),
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: interpolate(progress, [0, 1], [0, 1]),
              }}
            />
          </AbsoluteFill>
        );

      case "slide-left":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${interpolate(progress, [0, 1], [0, -100])}%)`,
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${interpolate(progress, [0, 1], [100, 0])}%)`,
              }}
            />
          </AbsoluteFill>
        );

      case "slide-right":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${interpolate(progress, [0, 1], [0, 100])}%)`,
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateX(${interpolate(progress, [0, 1], [-100, 0])}%)`,
              }}
            />
          </AbsoluteFill>
        );

      case "slide-up":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateY(${interpolate(progress, [0, 1], [0, -100])}%)`,
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateY(${interpolate(progress, [0, 1], [100, 0])}%)`,
              }}
            />
          </AbsoluteFill>
        );

      case "slide-down":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateY(${interpolate(progress, [0, 1], [0, 100])}%)`,
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translateY(${interpolate(progress, [0, 1], [-100, 0])}%)`,
              }}
            />
          </AbsoluteFill>
        );

      case "zoom":
        return (
          <AbsoluteFill>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${interpolate(progress, [0, 1], [1, 1.5])})`,
                opacity: interpolate(progress, [0, 1], [1, 0]),
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${interpolate(progress, [0, 1], [0.5, 1])})`,
                opacity: interpolate(progress, [0, 1], [0, 1]),
              }}
            />
          </AbsoluteFill>
        );

      case "spin":
        return (
          <AbsoluteFill>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `rotate(${interpolate(progress, [0, 1], [0, 180])}deg) scale(${interpolate(progress, [0, 1], [1, 0.5])})`,
                opacity: interpolate(progress, [0, 1], [1, 0]),
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `rotate(${interpolate(progress, [0, 1], [-180, 0])}deg) scale(${interpolate(progress, [0, 1], [0.5, 1])})`,
                opacity: interpolate(progress, [0, 1], [0, 1]),
              }}
            />
          </AbsoluteFill>
        );

      case "flip":
        return (
          <AbsoluteFill style={{ perspective: "1000px" }}>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `rotateY(${interpolate(progress, [0, 1], [0, 90])}deg)`,
                opacity: interpolate(progress, [0, 0.5], [1, 0]),
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `rotateY(${interpolate(progress, [0, 1], [-90, 0])}deg)`,
                opacity: interpolate(progress, [0.5, 1], [0, 1]),
              }}
            />
          </AbsoluteFill>
        );

      case "wipe-left":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img src={fromUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${interpolate(progress, [0, 1], [0, 100])}%`,
                height: "100%",
                backgroundImage: `url(${toUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </AbsoluteFill>
        );

      case "wipe-right":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img src={fromUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: `${interpolate(progress, [0, 1], [0, 100])}%`,
                height: "100%",
                backgroundImage: `url(${toUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </AbsoluteFill>
        );

      case "wipe-up":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img src={fromUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: `${interpolate(progress, [0, 1], [0, 100])}%`,
                backgroundImage: `url(${toUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </AbsoluteFill>
        );

      case "wipe-down":
        return (
          <AbsoluteFill style={{ overflow: "hidden" }}>
            <img src={fromUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${interpolate(progress, [0, 1], [0, 100])}%`,
                backgroundImage: `url(${toUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          </AbsoluteFill>
        );

      case "blur":
        return (
          <AbsoluteFill>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: `blur(${interpolate(progress, [0, 1], [0, 20])}px)`,
                opacity: interpolate(progress, [0, 1], [1, 0]),
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: `blur(${interpolate(progress, [0, 1], [20, 0])}px)`,
                opacity: interpolate(progress, [0, 1], [0, 1]),
              }}
            />
          </AbsoluteFill>
        );

      case "glitch":
        return (
          <AbsoluteFill>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: interpolate(progress, [0, 1], [1, 0]),
                transform: progress > 0.5 ? `translateX(${Math.sin(progress * 50) * 20}px)` : "none",
                filter: progress > 0.3 ? `hue-rotate(${progress * 360}deg)` : "none",
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: interpolate(progress, [0, 1], [0, 1]),
                transform: progress < 0.5 ? `translateX(${Math.sin(progress * 50) * 20}px)` : "none",
                filter: progress < 0.7 ? `hue-rotate(${(1 - progress) * 360}deg)` : "none",
              }}
            />
          </AbsoluteFill>
        );

      case "morph":
        return (
          <AbsoluteFill>
            <img
              src={fromUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: `${interpolate(progress, [0, 1], [0, 50])}%`,
                transform: `scale(${interpolate(progress, [0, 1], [1, 0.8])})`,
                opacity: interpolate(progress, [0, 1], [1, 0]),
              }}
            />
            <img
              src={toUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: `${interpolate(progress, [0, 1], [50, 0])}%`,
                transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
                opacity: interpolate(progress, [0, 1], [0, 1]),
              }}
            />
          </AbsoluteFill>
        );

      default:
        return (
          <AbsoluteFill>
            <img src={toUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        );
    }
  };

  return <>{renderTransition()}</>;
};

// Transition presets for different video styles
export const transitionPresets = {
  cinematic: ["fade", "slide-left", "zoom", "blur"] as TransitionType[],
  fast: ["cut", "slide-left", "slide-right", "wipe-left"] as TransitionType[],
  smooth: ["fade", "slide-up", "slide-down", "morph"] as TransitionType[],
  energetic: ["zoom", "spin", "glitch", "wipe-up"] as TransitionType[],
  elegant: ["fade", "morph", "blur", "flip"] as TransitionType[],
  social: ["cut", "slide-left", "slide-right", "zoom"] as TransitionType[],
};

export const getRandomTransition = (style: keyof typeof transitionPresets = "cinematic"): TransitionType => {
  const presets = transitionPresets[style];
  return presets[Math.floor(Math.random() * presets.length)];
};