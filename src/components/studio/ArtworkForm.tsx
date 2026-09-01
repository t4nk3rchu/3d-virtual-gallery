import { useState, useEffect, type FormEvent } from 'react';
import type { Artwork, ArtworkType, FrameConfig, Artist } from '../../types/schema';
import { extractGoogleDriveFileId, getImageUrl } from '../../lib/media/gdrive';
import { parseYouTubeVideoId, getYouTubeThumbnailUrl } from '../../lib/media/youtube';
import { isArtworkPlaced, setArtworkPlacement } from '../../lib/studio/artwork-placement';
import { DriveFilePicker } from './DriveFilePicker';
import { Icon, Button } from '../ui';

interface ArtworkFormProps {
  exhibitionId: string;
  artwork?: Artwork | 'new' | null;
  artists?: Artist[];
  isTeam?: boolean;
  embedded?: boolean;
  onEditHotspots?(artwork: Artwork): void;
  onSaved(artwork: Artwork): void;
  onDelete?(artworkId: string): void;
  onCancel(): void;
}

export function ArtworkForm({
  exhibitionId,
  artwork,
  artists = [],
  isTeam = false,
  embedded = false,
  onEditHotspots,
  onSaved,
  onDelete,
  onCancel,
}: ArtworkFormProps) {
  const isEditing = Boolean(artwork && artwork !== 'new');
  const activeArtwork = artwork && artwork !== 'new' ? artwork : null;

  const [title, setTitle] = useState(activeArtwork?.title ?? '');
  const [artist, setArtist] = useState(activeArtwork?.artist ?? '');
  const [artistId, setArtistId] = useState<string>(activeArtwork?.artist_id ?? '');
  const [year, setYear] = useState(activeArtwork?.year ?? '');
  const [medium, setMedium] = useState(activeArtwork?.medium ?? '');
  const [dimensions, setDimensions] = useState(activeArtwork?.dimensions ?? '');
  const [description, setDescription] = useState(activeArtwork?.description ?? '');
  const [artworkType, setArtworkType] = useState<ArtworkType>(
    activeArtwork?.artwork_type ?? 'IMAGE_2D'
  );

  // Media inputs
  const [driveInput, setDriveInput] = useState(activeArtwork?.media_file_id ?? '');
  const [youtubeInput, setYoutubeInput] = useState(
    activeArtwork?.youtube_video_id ? `https://youtu.be/${activeArtwork.youtube_video_id}` : ''
  );
  const [audioGuideInput, setAudioGuideInput] = useState(
    activeArtwork?.audio_guide_file_id ?? ''
  );

  // Frame config
  let initialFrameConfig: FrameConfig = {
    frameType: 'wood',
    frameWidth: 0.05,
    matWidth: 0.03,
    matColor: '#FFFFFF',
    showPlacard: true,
    allowTilt: true,
  };
  if (activeArtwork?.frame_config_json) {
    try {
      initialFrameConfig = { allowTilt: true, ...JSON.parse(activeArtwork.frame_config_json) };
    } catch {}
  }
  const [frameConfig, setFrameConfig] = useState<FrameConfig>(initialFrameConfig);

  const [isPlaced, setIsPlaced] = useState<boolean>(
    activeArtwork ? isArtworkPlaced(activeArtwork) : true
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeArtwork) {
      setTitle(activeArtwork.title || '');
      setArtist(activeArtwork.artist || '');
      setArtistId(activeArtwork.artist_id || '');
      setYear(activeArtwork.year || '');
      setMedium(activeArtwork.medium || '');
      setDimensions(activeArtwork.dimensions || '');
      setDescription(activeArtwork.description || '');
      setArtworkType(activeArtwork.artwork_type || 'IMAGE_2D');
      setDriveInput(activeArtwork.media_file_id || '');
      setYoutubeInput(activeArtwork.youtube_video_id ? `https://youtu.be/${activeArtwork.youtube_video_id}` : '');
      setAudioGuideInput(activeArtwork.audio_guide_file_id || '');
      setIsPlaced(isArtworkPlaced(activeArtwork));

      let cfg: FrameConfig = {
        frameType: 'wood',
        frameWidth: 0.05,
        matWidth: 0.03,
        matColor: '#FFFFFF',
        showPlacard: true,
        allowTilt: true,
      };
      if (activeArtwork.frame_config_json) {
        try {
          cfg = { allowTilt: true, ...JSON.parse(activeArtwork.frame_config_json) };
        } catch {}
      }
      setFrameConfig(cfg);
    } else {
      setTitle('');
      setArtist('');
      setArtistId('');
      setYear('');
      setMedium('');
      setDimensions('');
      setDescription('');
      setArtworkType('IMAGE_2D');
      setDriveInput('');
      setYoutubeInput('');
      setAudioGuideInput('');
      setIsPlaced(true);
      setFrameConfig({
        frameType: 'wood',
        frameWidth: 0.05,
        matWidth: 0.03,
        matColor: '#FFFFFF',
        showPlacard: true,
        allowTilt: true,
      });
    }
    setError(null);
  }, [artwork, activeArtwork?.id]);

  // Derived IDs
  const parsedDriveId = extractGoogleDriveFileId(driveInput);
  const parsedYoutubeId = parseYouTubeVideoId(youtubeInput);
  const parsedAudioGuideId = extractGoogleDriveFileId(audioGuideInput);

  const handleDelete = async () => {
    if (!activeArtwork) return;
    const ok = window.confirm(`Are you sure you want to permanently delete "${activeArtwork.title || 'this artwork'}"?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/artworks/${activeArtwork.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        if (onDelete) {
          onDelete(activeArtwork.id);
        } else {
          onCancel();
        }
      } else {
        setError('Failed to delete artwork.');
      }
    } catch {
      setError('Network error while deleting artwork.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    let mediaFileId: string | null = null;
    let youtubeVideoId: string | null = null;

    if (artworkType === 'IMAGE_2D') {
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

    const selectedArtistObj = artists.find((a) => a.id === artistId);
    const resolvedArtistName = artist.trim() || selectedArtistObj?.name || 'Untitled Artist';

    const payload: Record<string, unknown> = {
      exhibition_id: exhibitionId,
      title: title.trim() || 'Untitled',
      artist: resolvedArtistName,
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
      order_index: activeArtwork?.order_index ?? 0,
    };

    if (isEditing) {
      payload.transform_json = setArtworkPlacement(activeArtwork!.transform_json, isPlaced);
    } else {
      payload.transform_json = JSON.stringify({
        position: [0, 1.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        is_placed: isPlaced,
      });
    }

    setSubmitting(true);
    try {
      const url = isEditing ? `/api/artworks/${activeArtwork!.id}` : '/api/artworks';
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
        onSaved({ ...(activeArtwork as Artwork), ...payload });
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

  const previewImageSrc =
    artworkType === 'IMAGE_2D' && parsedDriveId
      ? getImageUrl(parsedDriveId, 'thumbnail')
      : artworkType === 'VIDEO' && parsedYoutubeId
      ? getYouTubeThumbnailUrl(parsedYoutubeId)
      : null;

  const formContent = (
    <form id="artwork-drawer-form" onSubmit={handleSubmit} className="artwork-form">
      {/* Placement Status: In Room vs Storage */}
      <div
        style={{
          background: 'var(--reda-parch-card)',
          border: '1px solid var(--reda-parch-border)',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--reda-ink-2)' }}>
            Room Placement
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: isPlaced ? 'var(--reda-success)' : 'var(--reda-warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Icon name={isPlaced ? 'pin' : 'cube'} size={13} />
            <span>{isPlaced ? 'Placed in 3D Room' : 'In Storage (Unplaced)'}</span>
          </div>
        </div>
        {isEditing ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={submitting}
            onClick={() => setIsPlaced(!isPlaced)}
            style={{
              fontSize: '11.5px',
              borderColor: isPlaced ? 'var(--reda-success-border)' : 'var(--reda-warning-border)',
              background: 'var(--reda-parch-card)',
              fontWeight: 600,
            }}
            title={isPlaced ? 'Move this artwork to storage (removes from 3D room)' : 'Place this artwork into the 3D gallery room'}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Icon name={isPlaced ? 'cube' : 'pin'} size={12} />
              <span>{isPlaced ? 'Move to Storage' : 'Place in Room'}</span>
            </span>
          </Button>
        ) : (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={isPlaced}
              onChange={(e) => setIsPlaced(e.target.checked)}
            />
            <span>Place in Room</span>
          </label>
        )}
      </div>

      {/* Pinned / Top Quick Actions: Live Frame Preview & Hotspots */}
      {(previewImageSrc || (isEditing && artworkType === 'IMAGE_2D' && activeArtwork)) && (
        <div
          className="wb-insp-top-pinned"
          style={{
            position: embedded ? 'sticky' : 'relative',
            top: 0,
            background: 'var(--reda-parch-card)',
            borderBottom: '1px solid var(--reda-parch-border)',
            margin: embedded ? '0 -16px 16px -16px' : '0 0 16px 0',
            padding: '14px 16px',
            zIndex: 6,
          }}
        >
          {previewImageSrc && (
            <div
              style={{
                background: 'var(--reda-char)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--reda-parch-border)',
                marginBottom: isEditing && artworkType === 'IMAGE_2D' ? '12px' : '0',
              }}
            >
              <div
                style={{
                  border:
                    frameConfig.frameType === 'none'
                      ? '1px dashed rgba(255,255,255,0.3)'
                      : frameConfig.frameType === 'canvas_wrap'
                      ? 'none'
                      : frameConfig.frameType === 'metal_black'
                      ? '8px solid var(--reda-frame-metal)'
                      : frameConfig.frameType === 'float_white'
                      ? '8px solid var(--reda-frame-float)'
                      : frameConfig.frameType === 'gold'
                      ? '8px solid var(--reda-frame-gold-mat)'
                      : '8px solid var(--reda-frame-wood)', // wood
                  padding: `${Math.round(frameConfig.matWidth * 200)}px`,
                  background: frameConfig.matColor || '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  maxWidth: '100%',
                  transition: 'border 0.2s ease',
                }}
              >
                <img
                  src={previewImageSrc}
                  alt="Framed Preview"
                  style={{
                    maxHeight: '130px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--reda-gold)',
                  fontFamily: 'var(--reda-ui)',
                  marginTop: '8px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Live Frame Preview • {frameConfig.frameType.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          )}

          {/* Hotspots Quick Action Banner */}
          {isEditing && artworkType === 'IMAGE_2D' && activeArtwork && (
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--reda-parch)',
                borderRadius: '6px',
                border: '1px solid var(--reda-parch-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: 'var(--reda-oxblood)',
                  }}
                >
                  Interactive Hotspots
                </div>
                <div style={{ fontFamily: 'var(--reda-text)', fontSize: '12px', color: 'var(--reda-ink-2)', marginTop: '2px' }}>
                  {(activeArtwork as unknown as { hotspots?: unknown[] }).hotspots?.length || 0} details pinned on canvas
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onEditHotspots?.(activeArtwork)}
              >
                <Icon name="pin" size={14} /> Edit Hotspots
              </Button>
            </div>
          )}
        </div>
      )}

        {/* Artwork Type Selection */}
        <div className="form-group">
          <label className="form-label">Artwork Medium Type</label>
          <div className="type-selector">
            <button
              type="button"
              className={`type-btn ${artworkType === 'IMAGE_2D' ? 'active' : ''}`}
              onClick={() => setArtworkType('IMAGE_2D')}
            >
              <Icon name="frame" /> 2D Painting / Image
            </button>
            <button
              type="button"
              className={`type-btn ${artworkType === 'VIDEO' ? 'active' : ''}`}
              onClick={() => setArtworkType('VIDEO')}
            >
              <Icon name="film" /> Video (YouTube)
            </button>
            <button
              type="button"
              className="type-btn type-btn--disabled"
              disabled
              title="3D Object Model — coming in a future update"
            >
              <Icon name="cube" /> 3D Object Model
              <span style={{ display: 'block', fontSize: '9px', letterSpacing: '.08em', opacity: 0.7, marginTop: '2px' }}>Under Construction</span>
            </button>
          </div>
        </div>

        {/* Media Input based on Type */}
        {artworkType === 'IMAGE_2D' && (
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label htmlFor="art-drive-img" className="form-label" style={{ marginBottom: 0 }}>
                Google Drive Image Link or File ID
              </label>
              <DriveFilePicker
                mimeTypes="image/png,image/jpeg,image/webp,image/gif"
                isTeam={isTeam}
                onPicked={(fileId) => setDriveInput(fileId)}
              />
            </div>
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
              Ensure the file is shared with the Reda Service Account in Google Drive.
            </p>
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
              <div className="media-preview" style={{ marginTop: '10px' }}>
                <img
                  src={`https://img.youtube.com/vi/${parsedYoutubeId}/hqdefault.jpg`}
                  alt="YouTube Video Preview"
                  className="thumbnail-preview"
                />
              </div>
            )}
          </div>
        )}

        {/* Optional Audio Guide */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label htmlFor="art-audio-guide" className="form-label" style={{ marginBottom: 0 }}>
              Audio Guide Narration (Optional Google Drive File ID)
            </label>
            <DriveFilePicker
              mimeTypes="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
              isTeam={isTeam}
              onPicked={(fileId) => setAudioGuideInput(fileId)}
            />
          </div>
          <input
            id="art-audio-guide"
            type="text"
            value={audioGuideInput}
            onChange={(e) => setAudioGuideInput(e.target.value)}
            placeholder="Google Drive link or ID for optional voiceover / audio guide"
            className="input"
          />
        </div>

        {/* Frame & Placard Configuration (for IMAGE_2D and VIDEO) */}
        {(artworkType === 'IMAGE_2D' || artworkType === 'VIDEO') && (
          <div className="studio-card__subgroup">
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--reda-ink)' }}>
              Frame &amp; Placard Settings
            </label>
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
                  <option value="metal_black">Matte Black</option>
                  <option value="float_white">Minimal White</option>
                  <option value="canvas_wrap">Canvas Wrap</option>
                  <option value="none">Frameless</option>
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

              <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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

            <div className="form-row" style={{ marginTop: '6px' }}>
              <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={frameConfig.allowTilt !== false}
                    onChange={(e) =>
                      setFrameConfig({
                        ...frameConfig,
                        allowTilt: e.target.checked,
                      })
                    }
                  />
                  Enable 3D Perspective Tilt in Inspect Mode
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Section */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="art-title" className="form-label">Title *</label>
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
              Link to Exhibition Artist Profile
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
        {embedded && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              margin: '16px -16px 0 -16px',
              padding: '12px 16px',
              background: 'var(--reda-parch-card)',
              borderTop: '1px solid var(--reda-parch-border)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={submitting}
                  onClick={handleDelete}
                  title="Permanently remove artwork from this exhibition"
                >
                  <Icon name="trash" size={13} /> Delete
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Add to Exhibition'}
              </Button>
            </div>
          </div>
        )}
      </form>
  );

  return formContent;
}

