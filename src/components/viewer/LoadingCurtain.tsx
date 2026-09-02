import { useState, useEffect } from 'react';
import { getIntroAnimation, type IntroTransition } from '../../lib/viewer/intro-animations';

export interface LoadingCurtainProps {
  title?: string;
  curatorName?: string | null;
  progress?: number;
  isReady?: boolean;
  transitionStyle?: IntroTransition;
  onRevealed(): void;
}

export function LoadingCurtain({
  title = 'Virtual Exhibition',
  curatorName,
  progress = 0,
  isReady = false,
  transitionStyle = 'slide_up',
  onRevealed,
}: LoadingCurtainProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const anim = getIntroAnimation(transitionStyle);

  // Derive dynamic curatorial stage label
  let stagePhrase = 'Opening Curatorial Archive…';
  if (clampedProgress >= 100 && isReady) {
    stagePhrase = 'Gallery Room Prepared';
  } else if (clampedProgress >= 75) {
    stagePhrase = 'Illuminating Gallery Spotlights & Frames…';
  } else if (clampedProgress >= 30) {
    stagePhrase = 'Streaming 3D Spatial Geometry…';
  }

  useEffect(() => {
    if (isReady) {
      setIsRevealing(true);
      const timer = setTimeout(() => {
        onRevealed();
      }, anim.durationMs);
      return () => clearTimeout(timer);
    }
  }, [isReady, anim.durationMs, onRevealed]);

  return (
    <div
      className={`loading-curtain ${isRevealing ? `loading-curtain--revealing ${anim.cssClass}` : ''}`}
      style={isRevealing ? { transitionDuration: `${anim.durationMs}ms` } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Exhibition Loading"
    >
      <div className="loading-curtain__ambient-grid" aria-hidden="true" />
      <div className="loading-curtain__ambient-glow" aria-hidden="true" />

      <div className="loading-curtain__card">
        {/* Gold Emblem Header */}
        <div className="loading-curtain__emblem-wrap">
          <img
            src="/reda_logo.png"
            alt="Reda Gallery"
            className="loading-curtain__emblem"
          />
        </div>

        <span className="loading-curtain__kicker">
          Reda Archival Gallery · Curated Space
        </span>

        <h1 className="loading-curtain__title">{title}</h1>

        {curatorName && (
          <p className="loading-curtain__curator">
            Curated by {curatorName}
          </p>
        )}

        {/* Progress & Stage Section */}
        <div className="loading-curtain__progress-section">
          <div className="loading-curtain__progress-header">
            <span className="loading-curtain__stage-text">{stagePhrase}</span>
            <span className="loading-curtain__percentage">{clampedProgress}%</span>
          </div>

          <div
            className="loading-curtain__progress-track"
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="loading-curtain__progress-bar"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
