import { useState, useRef, useEffect } from 'react';
import { proxyMediaUrl } from '../../lib/media/gdrive';
import { getIntroAnimation, type IntroTransition } from '../../lib/viewer/intro-animations';
import { Icon } from '../ui';

interface IntroVideoLoaderProps {
  title?: string;
  curatorName?: string | null;
  videoFileId: string;
  isSceneReady: boolean;
  transitionStyle?: IntroTransition;
  onVideoStarted?(): void;
  onVideoError?(): void;
  onEnterGallery(): void;
}

export function IntroVideoLoader({
  title,
  curatorName,
  videoFileId,
  isSceneReady,
  transitionStyle = 'zoom_in',
  onVideoStarted,
  onVideoError,
  onEnterGallery,
}: IntroVideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const videoUrl = proxyMediaUrl(videoFileId);
  const animPreset = getIntroAnimation(transitionStyle);

  const startPlaybackWithSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setHasStarted(true);
          onVideoStarted?.();
        })
        .catch(() => {
          // Fallback if browser still restricted audio
          video.muted = true;
          video.play().then(() => {
            setHasStarted(true);
            onVideoStarted?.();
          }).catch(() => {
            setVideoError(true);
            onVideoError?.();
          });
        });
    } else {
      setHasStarted(true);
      onVideoStarted?.();
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
          preload="auto"
          style={{ opacity: hasStarted ? 1 : 0.35, transition: 'opacity 0.6s ease', backgroundColor: '#000000' }}
          onEnded={handleVideoEnded}
          onError={() => {
            setVideoError(true);
            onVideoError?.();
          }}
        />
      ) : (
        <div className="intro-video-fallback">
          <div className="intro-video-spinner" />
          <p>Loading 3D Exhibition Space…</p>
        </div>
      )}

      {/* Center Entrance Card (Prompts user to start experience with full sound) */}
      {!hasStarted && !videoError && (
        <div className="intro-wordmark" style={{ maxWidth: '600px', width: '90%' }}>
          <div className="k">Exhibition Intro</div>
          <h2>{title || 'Virtual Exhibition'}</h2>
          {curatorName && (
            <p style={{ color: 'var(--reda-muted-hi)', fontSize: '14px', margin: '8px 0 0', letterSpacing: '0.04em' }}>
              Curated by {curatorName}
            </p>
          )}
          <div style={{ marginTop: '28px' }}>
            <button
              type="button"
              className="btn btn--primary intro-start-btn"
              onClick={startPlaybackWithSound}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 32px',
                fontSize: '15px',
                letterSpacing: '0.06em',
                fontWeight: 600,
                borderRadius: '999px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(185,138,60,0.3)',
                cursor: 'pointer',
              }}
            >
              <Icon name="play" size={16} /> Enter Exhibition
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions: Skip Button or Preparing Scene status once started */}
      {hasStarted && (
        <div className="intro-video-footer">
          {isSceneReady ? (
            <button
              type="button"
              className="intro-skip-btn"
              onClick={handleEnterGallery}
            >
              Enter Exhibition <Icon name="chevronRight" size={15} />
            </button>
          ) : (
            <div className="intro-loading-status">
              <span className="intro-status-spinner" />
              <span>Preparing 3D gallery space…</span>
            </div>
          )}
        </div>
      )}

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
