import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, Easing } from "remotion";

interface TestCompositionProps {
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
}

export const TestComposition: React.FC<TestCompositionProps> = ({
  duration = 5,
  fps = 30,
  width = 1920,
  height = 1080,
}) => {
  const { fps: configFps, width: configWidth, height: configHeight } = useVideoConfig();
  const frame = useCurrentFrame();
  const totalFrames = duration * configFps;
  const progress = frame / totalFrames;

  const configWidthNum = configWidth;
  const configHeightNum = configHeight;

  return (
    <AbsoluteFill style={{ width: configWidthNum, height: configHeightNum, backgroundColor: "#0a0a0f" }}>
      {/* Animated background gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, 
            hsl(${interpolate(progress, [0, 1], [220, 280])}, 70%, 20%) 0%, 
            hsl(${interpolate(progress, [0, 1], [280, 340])}, 70%, 15%) 100%)`,
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          color: "white",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: Math.max(72 * (configWidthNum / 1920), 48),
            fontWeight: 800,
            marginBottom: 24,
            textShadow: "0 4px 32px rgba(0,0,0,0.5)",
            opacity: interpolate(progress, [0, 0.2], [0, 1], { extrapolateLeft: "clamp" }),
            transform: `translateY(${interpolate(progress, [0, 0.2], [50, 0], { extrapolateLeft: "clamp" })}px)`,
          }}
        >
          Idea2Video AI
        </h1>

        <p
          style={{
            fontSize: Math.max(28 * (configWidthNum / 1920), 18),
            fontWeight: 400,
            opacity: interpolate(progress, [0.1, 0.3], [0, 1], { extrapolateLeft: "clamp" }),
            maxWidth: 800,
            margin: "0 auto 48px",
            lineHeight: 1.5,
          }}
        >
          Test Composition - 5 Second Render Verification
        </p>

        {/* Progress bar */}
        <div
          style={{
            width: Math.max(600 * (configWidthNum / 1920), 300),
            height: 6,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 3,
            overflow: "hidden",
            margin: "0 auto 32px",
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              backgroundColor: "white",
              borderRadius: 3,
              transition: "width 0.03s linear",
            }}
          />
        </div>

        {/* Frame counter */}
        <div
          style={{
            fontSize: Math.max(24 * (configWidthNum / 1920), 16),
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontVariantNumeric: "tabular-nums",
            opacity: 0.8,
          }}
        >
          Frame {frame} / {totalFrames} | {Math.round(progress * 100)}%
        </div>
      </div>

      {/* Corner markers for visual verification */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          width: 8,
          height: 8,
          backgroundColor: "white",
          borderRadius: "50%",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 40,
          width: 8,
          height: 8,
          backgroundColor: "white",
          borderRadius: "50%",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 40,
          width: 8,
          height: 8,
          backgroundColor: "white",
          borderRadius: "50%",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          width: 8,
          height: 8,
          backgroundColor: "white",
          borderRadius: "50%",
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

export const TestCompositionMetadata = {
  id: "TestComposition",
  component: TestComposition,
  defaultProps: {
    duration: 5,
    fps: 30,
    width: 1920,
    height: 1080,
  },
};
import React from "react";
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate } from "remotion";

interface TestCompositionProps {
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
}

export const TestComposition: React.FC<TestCompositionProps> = ({
  duration = 5,
  fps = 30,
  width = 1920,
  height = 1080,
}) => {
  const { fps: configFps, width: configWidth, height: configHeight } = useVideoConfig();
  const frame = useCurrentFrame();
  const totalFrames = duration * configFps;
  const progress = frame / totalFrames;

  // Animated background color
  const hue = interpolate(progress, [0, 1], [200, 300]);
  const backgroundColor = `hsl(${hue}, 70%, 30%)`;

  // Animated text position
  const yPosition = interpolate(progress, [0, 0.5, 1], [configHeight * 1.2, configHeight / 2, -configHeight * 0.2]);

  return (
    <AbsoluteFill style={{ width: configWidth, height: configHeight, backgroundColor }}>
      <div
        style={{
          position: "absolute",
          top: yPosition,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "white",
          fontSize: 80,
          fontWeight: "bold",
          fontFamily: "Arial, sans-serif",
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        Idea2Video Test Render
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.8)",
          fontSize: 32,
          fontFamily: "Arial, sans-serif",
        }}
      >
        Frame {frame} / {totalFrames} | {Math.round(progress * 100)}%
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: configWidth * 0.2,
          right: configWidth * 0.2,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: "white",
            transition: "width 0.03s linear",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const TestCompositionMetadata = {
  id: "TestComposition",
  component: TestComposition,
  defaultProps: {
    duration: 5,
    fps: 30,
    width: 1920,
    height: 1080,
  },
};