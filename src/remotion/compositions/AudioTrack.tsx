import React, { useRef, useEffect } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface AudioTrackProps {
  src: string | undefined;
  startFrame: number;
  endFrame: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export const AudioTrack: React.FC<AudioTrackProps> = ({
  src,
  startFrame,
  endFrame,
  volume = 1,
  fadeIn = 0,
  fadeOut = 0,
}) => {
  if (!src) return null;

  const currentFrame = useCurrentFrame();
  const isActive = currentFrame >= startFrame && currentFrame < endFrame;
  const audioRef = useRef<HTMLAudioElement>(null);

  // Control volume via ref
  useEffect(() => {
    if (audioRef.current && isActive) {
      let currentVolume = volume;

      if (fadeIn > 0 && currentFrame < startFrame + fadeIn) {
        currentVolume *= interpolate(currentFrame - startFrame, [0, fadeIn], [0, 1]);
      }

      if (fadeOut > 0 && currentFrame > endFrame - fadeOut) {
        currentVolume *= interpolate(currentFrame - (endFrame - fadeOut), [0, fadeOut], [1, 0]);
      }

      audioRef.current.volume = currentVolume;
    }
  }, [currentFrame, isActive, startFrame, endFrame, volume, fadeIn, fadeOut, fadeOut]);

  if (!isActive) return null;

  return (
    <audio
      ref={audioRef}
      src={src}
      autoPlay
      playsInline
      style={{ display: "none" }}
    />
  );
};

interface MultiTrackAudioProps {
  tracks: Array<{
    src: string;
    startFrame: number;
    endFrame: number;
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
  }>;
}

export const MultiTrackAudio: React.FC<MultiTrackAudioProps> = ({ tracks }) => {
  return (
    <>
      {tracks.map((track, index) => (
        <AudioTrack
          key={index}
          src={track.src}
          startFrame={track.startFrame}
          endFrame={track.endFrame}
          volume={track.volume}
          fadeIn={track.fadeIn}
          fadeOut={track.fadeOut}
        />
      ))}
    </>
  );
};