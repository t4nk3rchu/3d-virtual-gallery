-- Migration 0003: Add dedicated audio_file_id column to artwork_hotspots
ALTER TABLE artwork_hotspots ADD COLUMN audio_file_id TEXT;
