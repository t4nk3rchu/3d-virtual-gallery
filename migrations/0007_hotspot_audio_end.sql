-- Migration 0007: Add optional stop timestamp for audio-guide-seek hotspots.
-- Lets a hotspot play a bounded segment of the main audio guide (start → stop) instead
-- of playing from the start timestamp to the end of the track.
ALTER TABLE artwork_hotspots ADD COLUMN audio_timestamp_end_seconds REAL;
