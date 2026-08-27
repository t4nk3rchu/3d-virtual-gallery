import { useState, type FormEvent } from 'react';
import type { Artwork, ArtworkType, FrameConfig, Artist } from '../../types/schema';
import { extractGoogleDriveFileId, getImageUrl } from '../../lib/media/gdrive';
import { parseYouTubeVideoId } from '../../lib/media/youtube';

interface ArtworkFormProps {
  exhibitionId: string;
  artwork?: Artwork | null;
  artists?: Artist[];
  onSaved(artwork: Artwork): void;
  onCancel(): void;
}

export function ArtworkForm({
  exhibitionId,
  artwork,
  artists = [],
  onSaved,
  onCancel,
}: ArtworkFormProps) {
  const isEditing = Boolean(artwork);

  const [title, setTitle] = useState(artwork?.title ?? '');
  const [artist, setArtist] = useState(artwork?.artist ?? '');
  const [artistId, setArtistId] = useState<string>(artwork?.artist_id ?? '');
  const [year, setYear] = useState(artwork?.year ?? '');
  const [medium, setMedium] = useState(artwork?.medium ?? '');
  const [dimensions, setDimensions] = useState(artwork?.dimensions ?? '');
  const [description, setDescription] = useState(artwork?.description ?? '');
  const [artworkType, setArtworkType] = useState<ArtworkType>(
    artwork?.artwork_type ?? 'IMAGE_2D'
  );

  // Media inputs
  const [driveInput, setDriveInput] = useState(artwork?.media_file_id ?? '');
  const [youtubeInput, setYoutubeInput] = useState(
    artwork?.youtube_video_id ? `https://youtu.be/${artwork.youtube_video_id}` : ''
  );
  const [audioGuideInput, setAudioGuideInput] = useState(
    artwork?.audio_guide_file_id ?? ''
  );

  // Frame config
  let initialFrameConfig: FrameConfig = {
    frameType: 'wood',
    frameWidth: 0.05,
    matWidth: 0.03,
    matColor: '#FFFFFF',
    showPlacard: true,
  };
  if (artwork?.frame_config_json) {
    try {
      initialFrameConfig = JSON.parse(artwork.frame_config_json);
    } catch {}
  }
  const [frameConfig, setFrameConfig] = useState<FrameConfig>(initialFrameConfig);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived IDs
  const parsedDriveId = extractGoogleDriveFileId(driveInput);
  const parsedYoutubeId = parseYouTubeVideoId(youtubeInput);
  const parsedAudioGuideId = extractGoogleDriveFileId(audioGuideInput);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    let mediaFileId: string | null = null;
    let youtubeVideoId: string | null = null;

    if (artworkType === 'IMAGE_2D' || artworkType === 'AUDIO') {
      const input = driveInput.trim();
      mediaFileId =
        extractGoogleDriveFileId(input) ||
        (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('/') || input.startsWith('data:')
          ? input
          : null);
      if (!mediaFileId) {
        setError(
          `Please provide a Google Drive sharing link, file ID, or direct ${
            artworkType === 'IMAGE_2D' ? 'image' : 'audio'
          } URL.`
        );
        return;
      }
    }

    if (artworkType === 'VIDEO') {
      youtubeVideoId = parseYouTubeVideoId(youtubeInput);
      if (!youtubeVideoId) {
        setError('Please provide a valid YouTube video link or 11-character video ID.');
        return;
      }
    }

    const payload = {
      exhibition_id: exhibitionId,
      title: title.trim() || 'Untitled',
      artist: artist.trim(),
      artist_id: artistId || null,
      year: year.trim() || null,
      medium: medium.trim() || null,
      dimensions: dimensions.trim() || null,
      description: description.trim() || null,
      artwork_type: artworkType,
      media_file_id: mediaFileId,
      youtube_video_id: youtubeVideoId,
      audio_guide_file_id: parsedAudioGuideId,
      frame_config_json: JSON.stringify(frameConfig),
      transform_json:
        artwork?.transform_json ??
        JSON.stringify({
          position: [0, 1.5, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        }),
      order_index: artwork?.order_index ?? 0,
    };

    setSubmitting(true);
    try {
      const url = isEditing ? `/api/artworks/${artwork!.id}` : '/api/artworks';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      if (isEditing) {
        onSaved({ ...(artwork as Artwork), ...payload });
      } else {
        const created = (await res.json()) as Artwork;
        onSaved(created);
      }
    } catch {
      setError('Network error while saving artwork.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Artwork' : 'Add New Artwork'}</h2>
          <button className="btn btn--ghost" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="artwork-form">
          {/* Artwork Type Selection */}
          <div className="form-group">
            <label className="form-label">Artwork Medium Type</label>
            <div className="type-selector">
              <button
                type="button"
                className={`type-btn ${artworkType === 'IMAGE_2D' ? 'active' : ''}`}
                onClick={() => setArtworkType('IMAGE_2D')}
              >
                🖼️ 2D Painting / Image
              </button>
              <button
                type="button"
                className={`type-btn ${artworkType === 'VIDEO' ? 'active' : ''}`}
                onClick={() => setArtworkType('VIDEO')}
              >
                🎬 Video (YouTube)
              </button>
              <button
                type="button"
                className={`type-btn ${artworkType === 'AUDIO' ? 'active' : ''}`}
                onClick={() => setArtworkType('AUDIO')}
              >
                🎵 Spatial Audio Track
              </button>
            </div>
          </div>

          {/* Media Input based on Type */}
          {artworkType === 'IMAGE_2D' && (
            <div className="form-group">
              <label htmlFor="art-drive-img" className="form-label">
                Google Drive Image Link or File ID
              </label>
              <input
                id="art-drive-img"
                type="text"
                value={driveInput}
                onChange={(e) => setDriveInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/1A2B3C... or bare file ID"
                required
                className="input"
              />
              <p className="hint">
                ⚠️ Ensure sharing in Google Drive is set to &ldquo;Anyone with the link can view&rdquo;.
              </p>
              {parsedDriveId && (
                <div className="media-preview">
                  <span className="preview-tag">Live Preview:</span>
                  <img
                    src={getImageUrl(parsedDriveId, 'thumbnail')}
                    alt="Preview"
                    className="thumbnail-preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.display = 'block';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {artworkType === 'VIDEO' && (
            <div className="form-group">
              <label htmlFor="art-youtube" className="form-label">
                YouTube Video Link or Video ID
              </label>
              <input
                id="art-youtube"
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                required
                className="input"
              />
              {parsedYoutubeId && (
                <div className="media-preview">
                  <span className="preview-tag">Video Preview:</span>
                  <img
                    src={`https://img.youtube.com/vi/${parsedYoutubeId}/hqdefault.jpg`}
                    alt="YouTube Video Preview"
                    className="thumbnail-preview"
                  />
                </div>
              )}
            </div>
          )}

          {artworkType === 'AUDIO' && (
            <div className="form-group">
              <label htmlFor="art-audio" className="form-label">
                Google Drive Audio File Link or ID (MP3 / WAV / OGG)
              </label>
              <input
                id="art-audio"
                type="text"
                value={driveInput}
                onChange={(e) => setDriveInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or audio fileId"
                required
                className="input"
              />
              <p className="hint">
                Audio artworks appear in the gallery as interactive glowing markers with spatial sound.
              </p>
            </div>
          )}

          {/* Optional Audio Guide Narration for any artwork */}
          <div className="form-group">
            <label htmlFor="art-audio-guide" className="form-label">
              Audio Guide Narration (Optional Google Drive File ID)
            </label>
            <input
              id="art-audio-guide"
              type="text"
              value={audioGuideInput}
              onChange={(e) => setAudioGuideInput(e.target.value)}
              placeholder="Google Drive link or ID for optional voiceover / audio guide"
              className="input"
            />
          </div>

          {/* Frame Configuration (for IMAGE_2D) */}
          {artworkType === 'IMAGE_2D' && (
            <fieldset className="frame-options">
              <legend>Frame &amp; Placard Settings</legend>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="frame-type" className="form-label">Frame Material</label>
                  <select
                    id="frame-type"
                    value={frameConfig.frameType}
                    onChange={(e) =>
                      setFrameConfig({
                        ...frameConfig,
                        frameType: e.target.value as FrameConfig['frameType'],
                      })
                    }
                    className="input select"
                  >
                    <option value="wood">Natural Wood</option>
                    <option value="gold">Ornate Gold</option>
                    <option value="black_matte">Matte Black</option>
                    <option value="white">Minimal White</option>
                    <option value="none">Frameless / Canvas Wrap</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="frame-width" className="form-label">Frame Width (m)</label>
                  <input
                    id="frame-width"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="0.2"
                    value={frameConfig.frameWidth}
                    onChange={(e) =>
                      setFrameConfig({
                        ...frameConfig,
                        frameWidth: parseFloat(e.target.value) || 0.05,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mat-width" className="form-label">Mat Border Width (m)</label>
                  <input
                    id="mat-width"
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.3"
                    value={frameConfig.matWidth}
                    onChange={(e) =>
                      setFrameConfig({
                        ...frameConfig,
                        matWidth: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={frameConfig.showPlacard}
                      onChange={(e) =>
                        setFrameConfig({
                          ...frameConfig,
                          showPlacard: e.target.checked,
                        })
                      }
                    />
                    Display Wall Placard under artwork
                  </label>
                </div>
              </div>
            </fieldset>
          )}

          {/* Metadata Section */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="art-title" className="form-label">Title</label>
              <input
                id="art-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artwork title"
                required
                className="input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="art-artist" className="form-label">
                Artist Name
                {artists.length > 0 && <span className="hint"> (or link to profile below)</span>}
              </label>
              <input
                id="art-artist"
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist name"
                className="input"
              />
            </div>
          </div>

          {artists.length > 0 && (
            <div className="form-group">
              <label htmlFor="art-artist-profile" className="form-label">
                👤 Link to Exhibition Artist Profile
              </label>
              <select
                id="art-artist-profile"
                className="input select"
                value={artistId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setArtistId(selectedId);
                  const matched = artists.find((a) => a.id === selectedId);
                  if (matched && (!artist || artist === '')) {
                    setArtist(matched.name);
                  }
                }}
              >
                <option value="">-- No linked artist profile --</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.life_dates ? `(${a.life_dates})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="art-medium" className="form-label">Medium</label>
              <input
                id="art-medium"
                type="text"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="e.g. Oil on linen, Digital canvas"
                className="input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="art-year" className="form-label">Year</label>
              <input
                id="art-year"
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                className="input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="art-dims" className="form-label">Physical Dimensions</label>
              <input
                id="art-dims"
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="e.g. 120 × 90 cm"
                className="input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="art-desc" className="form-label">Description / Curator Statement</label>
            <textarea
              id="art-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Background, historical notes, or thematic context displayed in focus panel"
              className="input textarea"
            />
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving Artwork…' : isEditing ? 'Save Changes' : 'Add to Exhibition'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
