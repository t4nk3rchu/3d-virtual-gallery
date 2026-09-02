import { useState, useEffect, type RefObject } from 'react';
import { Icon } from '../ui';

interface AudioGuidePlayerProps {
  /** External audio element to control. The element is owned by the parent so playback
   *  survives this UI mounting/unmounting (e.g. opening/closing the info panel). */
  audioRef: RefObject<HTMLAudioElement | null>;
  title?: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function AudioGuidePlayer({ audioRef, title = 'Audio Narration', className = '' }: AudioGuidePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Bind to the external element: sync initial state (it may already be playing) + subscribe to events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsPlaying(!audio.paused);
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
    setIsLoaded(audio.readyState >= 1);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => { setDuration(audio.duration || 0); setIsLoaded(true); };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
    };
  }, [audioRef]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
    if (!nextMute && volume === 0) {
      setVolume(0.5);
      audioRef.current.volume = 0.5;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;

  return (
    <div
      className={`reda-audio-player ${className}`}
      role="region"
      aria-label={`Audio guide: ${title}`}
    >
      {/* Header with Title & Badge */}
      <div className="reda-audio-player__header">
        <div className="reda-audio-player__title-group">
          <span className="reda-audio-player__icon">
            <Icon name="audio" size={13} />
          </span>
          <span className="reda-audio-player__kicker">AUDIO GUIDE</span>
        </div>
        <span className="reda-audio-player__status">
          {isPlaying ? 'PLAYING' : isLoaded ? 'READY' : 'AUDIO'}
        </span>
      </div>

      {/* Primary Control Bar & Progress */}
      <div className="reda-audio-player__body">
        {/* Play/Pause Button */}
        <button
          type="button"
          className={`reda-audio-player__play-btn ${isPlaying ? 'is-playing' : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
          title={isPlaying ? 'Pause' : 'Play audio narration'}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={14} />
        </button>

        {/* Scrubber and Time */}
        <div className="reda-audio-player__scrubber-group">
          <div className="reda-audio-player__progress-wrap">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="reda-audio-player__slider reda-audio-player__slider--track"
              aria-label="Audio progress slider"
              style={{
                background: `linear-gradient(to right, var(--reda-gold) 0%, var(--reda-gold) ${progressPercent}%, rgba(185, 138, 60, 0.22) ${progressPercent}%, rgba(185, 138, 60, 0.22) 100%)`
              }}
            />
          </div>

          <div className="reda-audio-player__time-display">
            <span className="reda-audio-player__time-current">{formatTime(currentTime)}</span>
            <span className="reda-audio-player__time-divider">/</span>
            <span className="reda-audio-player__time-total">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume controls */}
        <div className="reda-audio-player__volume-group">
          <button
            type="button"
            className="reda-audio-player__mute-btn"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <Icon name="sound" size={13} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="reda-audio-player__slider reda-audio-player__slider--volume"
            aria-label="Volume slider"
            style={{
              background: `linear-gradient(to right, var(--reda-cream-hi) 0%, var(--reda-cream-hi) ${volumePercent}%, rgba(236, 227, 206, 0.2) ${volumePercent}%, rgba(236, 227, 206, 0.2) 100%)`
            }}
          />
        </div>
      </div>
    </div>
  );
}
