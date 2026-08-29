import { useState, useEffect, type MouseEvent } from 'react';
import type { Artwork, ArtworkHotspot, FrameConfig, HotspotTransition } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../../lib/media/gdrive';
import { HOTSPOT_TRANSITIONS, getHotspotAnimation } from '../../lib/viewer/hotspot-animations';
import { HotspotTransitionPreview } from './HotspotTransitionPreview';
import { DriveFilePicker } from './DriveFilePicker';

interface HotspotEditorProps {
  artwork: Artwork;
  hotspots: ArtworkHotspot[];
  isTeam?: boolean;
  onHotspotsUpdated(updated: ArtworkHotspot[]): void;
  onClose(): void;
}

export function HotspotEditor({
  artwork,
  hotspots,
  isTeam = false,
  onHotspotsUpdated,
  onClose,
}: HotspotEditorProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<ArtworkHotspot | null>(null);
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioTimestamp, setAudioTimestamp] = useState<string>('');
  const [audioFileId, setAudioFileId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialFrameConfig: FrameConfig = (() => {
    try {
      return artwork.frame_config_json ? JSON.parse(artwork.frame_config_json) : {};
    } catch {
      return {} as FrameConfig;
    }
  })();

  const [transitionStyle, setTransitionStyle] = useState<HotspotTransition>(
    initialFrameConfig.hotspotTransition || 'arc_dip'
  );
  const [savingTransition, setSavingTransition] = useState(false);
  const [transitionSavedMsg, setTransitionSavedMsg] = useState<string | null>(null);

  const handleTransitionChange = async (newStyle: HotspotTransition) => {
    setTransitionStyle(newStyle);
    setSavingTransition(true);
    setTransitionSavedMsg(null);
    try {
      const updatedConfig: FrameConfig = {
        ...initialFrameConfig,
        hotspotTransition: newStyle,
      };
      const res = await fetch(`/api/artworks/${artwork.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          frame_config_json: JSON.stringify(updatedConfig),
        }),
      });
      if (res.ok) {
        artwork.frame_config_json = JSON.stringify(updatedConfig);
        setTransitionSavedMsg('✓ Transition saved');
        setTimeout(() => setTransitionSavedMsg(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSavingTransition(false);
    }
  };

  const primaryUrl = artwork.media_file_id
    ? proxyMediaUrl(artwork.media_file_id, artwork.updated_at)
    : null;
  const fallbackUrl = artwork.media_file_id
    ? getImageUrl(artwork.media_file_id, 'original')
    : null;

  const [imgSrc, setImgSrc] = useState<string | null>(primaryUrl);

  useEffect(() => {
    setImgSrc(primaryUrl);
  }, [primaryUrl]);

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, Math.round(x * 10) / 10));
    const clampedY = Math.max(0, Math.min(100, Math.round(y * 10) / 10));

    setSelectedHotspot(null);
    setNewPin({ x: clampedX, y: clampedY });
    setTitle('');
    setDescription('');
    setAudioTimestamp('');
    setAudioFileId('');
    setError(null);
  };

  const handleCreateHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin) return;
    setError(null);
    setSaving(true);

    const cleanAudioId = audioFileId.trim();
    // Extract drive file id if a full Google Drive link was pasted
    const match = cleanAudioId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanAudioId.match(/id=([a-zA-Z0-9_-]+)/);
    const resolvedAudioId = match ? match[1] : cleanAudioId;

    try {
      const res = await fetch('/api/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          artwork_id: artwork.id,
          x_percent: newPin.x,
          y_percent: newPin.y,
          title: title.trim() || 'Detail Hotspot',
          description: description.trim(),
          audio_timestamp_seconds: audioTimestamp.trim()
            ? parseFloat(audioTimestamp)
            : null,
          audio_file_id: resolvedAudioId || null,
        }),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const created = (await res.json()) as ArtworkHotspot;
      onHotspotsUpdated([...hotspots, created]);
      setNewPin(null);
      setTitle('');
      setDescription('');
      setAudioTimestamp('');
      setAudioFileId('');
    } catch {
      setError('Failed to create hotspot.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHotspot = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hotspots/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onHotspotsUpdated(hotspots.filter((h) => h.id !== id));
        setSelectedHotspot(null);
      } else {
        setError('Failed to delete hotspot.');
      }
    } catch {
      setError('Network error deleting hotspot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Interactive Hotspot Editor</h2>
            <p className="subtitle">Artwork: {artwork.title}</p>
          </div>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Hotspot Camera Transition Selector Toolbar */}
        <div
          className="hotspot-transition-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label
                htmlFor="hotspot-anim-select"
                style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e0e0e0', whiteSpace: 'nowrap' }}
              >
                🎥 Transition Animation:
              </label>
              <select
                id="hotspot-anim-select"
                value={transitionStyle}
                onChange={(e) => handleTransitionChange(e.target.value as HotspotTransition)}
                disabled={savingTransition}
                className="input select"
                style={{ minWidth: '220px', padding: '0.35rem 0.6rem' }}
              >
                {HOTSPOT_TRANSITIONS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} ({preset.durationMs}ms)
                  </option>
                ))}
              </select>

              {savingTransition && <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Saving…</span>}
              {transitionSavedMsg && (
                <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 600 }}>
                  {transitionSavedMsg}
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: '#a0a0a0' }}>
              {getHotspotAnimation(transitionStyle).description}
            </p>
          </div>

          <HotspotTransitionPreview transition={transitionStyle} />
        </div>

        <div className="hotspot-editor-layout">
          {/* Visual Image View with Pins */}
          <div className="hotspot-canvas-container">
            <p className="canvas-instruction">
              💡 Click anywhere on the artwork image to drop a new interpretive hotspot pin.
            </p>
            {imgSrc ? (
              <div className="hotspot-image-wrapper" onClick={handleImageClick}>
                <img
                  src={imgSrc}
                  alt={artwork.title}
                  className="hotspot-image"
                  draggable={false}
                  onError={() => {
                    if (imgSrc !== fallbackUrl && fallbackUrl) {
                      setImgSrc(fallbackUrl);
                    }
                  }}
                />

                {/* Existing Hotspot Pins */}
                {hotspots.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`hotspot-pin ${selectedHotspot?.id === h.id ? 'selected' : ''}`}
                    style={{
                      position: 'absolute',
                      left: `${h.x_percent}%`,
                      top: `${h.y_percent}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewPin(null);
                      setSelectedHotspot(h);
                    }}
                    title={h.title}
                  >
                    <span className="hotspot-pin__dot" />
                  </button>
                ))}

                {/* Newly Placed Pin Indicator */}
                {newPin && (
                  <div
                    className="hotspot-pin new-pin"
                    style={{
                      position: 'absolute',
                      left: `${newPin.x}%`,
                      top: `${newPin.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <span className="hotspot-pin__dot" />
                  </div>
                )}
              </div>
            ) : (
              <p>No image file associated with this artwork.</p>
            )}
          </div>

          {/* Hotspot Form & Details Panel */}
          <div className="hotspot-sidebar">
            {newPin && (
              <form onSubmit={handleCreateHotspot} className="hotspot-pin-form">
                <h3>New Hotspot Pin</h3>
                <p className="coords-readout">
                  Location: X: {newPin.x}%, Y: {newPin.y}%
                </p>

                <div className="form-group">
                  <label htmlFor="hs-title" className="form-label">Hotspot Title</label>
                  <input
                    id="hs-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Signature, Craquelure, Symbolism"
                    required
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hs-desc" className="form-label">Interpretive Text</label>
                  <textarea
                    id="hs-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description displayed when visitor clicks this pin"
                    required
                    className="input textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hs-seek" className="form-label">
                    Option A: Audio Guide Timestamp (Seconds)
                  </label>
                  <input
                    id="hs-seek"
                    type="number"
                    step="0.1"
                    min="0"
                    value={audioTimestamp}
                    onChange={(e) => setAudioTimestamp(e.target.value)}
                    placeholder="e.g. 42.5 (jump in main audio guide)"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="hs-audio" className="form-label" style={{ marginBottom: 0 }}>
                      Option B: Dedicated Audio File Link (Google Drive / URL)
                    </label>
                    <DriveFilePicker
                      mimeTypes="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
                      isTeam={isTeam}
                      buttonLabel="📁 Pick Audio from Google Drive"
                      onPicked={(fileId) => setAudioFileId(fileId)}
                      onRejected={(name) =>
                        setError(`"${name}" isn't shared with "Anyone with the link" — please update sharing settings in Google Drive and try again.`)
                      }
                    />
                  </div>
                  <input
                    id="hs-audio"
                    type="text"
                    value={audioFileId}
                    onChange={(e) => setAudioFileId(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or direct audio URL"
                    className="input"
                  />
                  <p className="hint">
                    💡 You can provide a dedicated audio clip narration specific to this hotspot.
                  </p>
                </div>

                {error && <p className="error">{error}</p>}

                <div className="form-actions">
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Add Hotspot Pin'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setNewPin(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {selectedHotspot && !newPin && (
              <div className="hotspot-details-card">
                <h3>{selectedHotspot.title}</h3>
                <p className="coords-readout">
                  Pin at: X: {selectedHotspot.x_percent}%, Y: {selectedHotspot.y_percent}%
                </p>
                <p className="hotspot-desc">{selectedHotspot.description}</p>
                {selectedHotspot.audio_timestamp_seconds != null && (
                  <p className="audio-tag">
                    ⏱️ Audio Guide Seek: {selectedHotspot.audio_timestamp_seconds}s
                  </p>
                )}
                {selectedHotspot.audio_file_id && (
                  <p className="audio-tag">
                    🎵 Dedicated Audio File: {selectedHotspot.audio_file_id}
                  </p>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                    disabled={saving}
                  >
                    {saving ? 'Deleting…' : 'Delete Hotspot Pin'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setSelectedHotspot(null)}
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {!newPin && !selectedHotspot && (
              <div className="hotspot-empty-state">
                <p>Click on the image to place a pin, or click an existing pin to inspect/delete it.</p>
                <p>Total hotspots on this artwork: {hotspots.length}</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Done Editing Hotspots
          </button>
        </div>
      </div>
    </div>
  );
}
