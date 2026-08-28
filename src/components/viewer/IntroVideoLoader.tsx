import { useState, useRef, useEffect } from 'react';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { getIntroAnimation, type IntroTransition } from '../../lib/viewer/intro-animations';

interface IntroVideoLoaderProps {
  videoFileId: string;
  isSceneReady: boolean;
  transitionStyle?: IntroTransition;
  onEnterGallery(): void;
}

export function IntroVideoLoader({
  videoFileId,
  isSceneReady,
  transitionStyle = 'zoom_in',
  onEnterGallery,
}: IntroVideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const videoUrl = proxyMediaUrl(videoFileId);
  const animPreset = getIntroAnimation(transitionStyle);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Attempt unmuted autoplay first (User Request: Option A without mute)
    video.muted = false;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsMuted(false);
          setShowUnmuteHint(false);
        })
        .catch(() => {
          // Browser Autoplay Policy blocked unmuted playback
          // Fallback to muted playback and show sound prompt
          video.muted = true;
          setIsMuted(true);
          setShowUnmuteHint(true);
          video.play().catch(() => {
            setVideoError(true);
          });
        });
    }
  }, [videoUrl]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      setIsMuted(false);
      setShowUnmuteHint(false);
    }
  };

  const handleEnterGallery = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onEnterGallery();
    }, animPreset.durationMs);
  };

  const handleVideoEnded = () => {
    setVideoEnded(true);
    if (isSceneReady) {
      handleEnterGallery();
    }
  };

  // If video errored out or cannot load, immediately allow entering or enter if ready
  useEffect(() => {
    if (videoError && isSceneReady) {
      handleEnterGallery();
    }
  }, [videoError, isSceneReady]);

  // If the clip finished before the scene was ready, auto-advance once it becomes
  // ready with smooth fade crossfade
  useEffect(() => {
    if (videoEnded && isSceneReady) {
      handleEnterGallery();
    }
  }, [videoEnded, isSceneReady]);

  return (
    <div
      className={`intro-video-overlay ${isFadingOut ? `intro-video-overlay--fading-out ${animPreset.cssClass}` : ''}`}
      style={isFadingOut ? { transitionDuration: `${animPreset.durationMs}ms` } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Exhibition Intro"
    >
      {!videoError ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="intro-video-player"
          playsInline
          autoPlay
          onEnded={handleVideoEnded}
          onError={() => setVideoError(true)}
        />
      ) : (
        <div className="intro-video-fallback">
          <div className="intro-video-spinner" />
          <p>Loading 3D Exhibition Space…</p>
        </div>
      )}

      {/* Top Left Branding / Indicator */}
      <div className="intro-video-header">
        <span className="intro-video-tag">🎬 Exhibition Intro</span>
      </div>

      {/* Unmute Prompt Overlay when browser forced muted autoplay */}
      {showUnmuteHint && isMuted && (
        <button
          type="button"
          className="intro-unmute-btn"
          onClick={handleUnmute}
          title="Click to enable audio"
        >
          🔊 Bật âm thanh / Enable sound
        </button>
      )}

      {/* Bottom Actions: Skip Button or Preparing Scene status */}
      <div className="intro-video-footer">
        {isSceneReady ? (
          <button
            type="button"
            className="intro-skip-btn"
            onClick={handleEnterGallery}
          >
            Enter Exhibition ➔
          </button>
        ) : (
          <div className="intro-loading-status">
            <span className="intro-status-spinner" />
            <span>Preparing 3D gallery space…</span>
          </div>
        )}
      </div>

      {/* If video ended but scene is still loading in background */}
      {videoEnded && !isSceneReady && (
        <div className="intro-ended-wait">
          <div className="intro-video-spinner" />
          <p>Finalizing 3D artwork textures…</p>
        </div>
      )}
    </div>
  );
}
