import { useState, useEffect, useRef, type MouseEvent } from 'react';
import type { Artwork, ArtworkHotspot, FrameConfig, HotspotTransition } from '../../types/schema';
import { getImageUrl, proxyMediaUrl } from '../../lib/media/gdrive';
import { HOTSPOT_TRANSITIONS, getHotspotAnimation } from '../../lib/viewer/hotspot-animations';
import { HotspotTransitionPreview } from './HotspotTransitionPreview';
import { DriveFilePicker } from './DriveFilePicker';
import { Model3DHotspotEditor } from './Model3DHotspotEditor';
import { Button, Icon } from '../ui';
import { useToast } from '../../context/ToastContext';

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
  const toast = useToast();
  const is3D = artwork.artwork_type === 'MODEL_3D';
  const [selectedHotspot, setSelectedHotspot] = useState<ArtworkHotspot | null>(null);
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  // MODEL_3D: pending anchor captured from a click-to-drop on the model surface,
  // and the anchor currently attached to the hotspot being edited.
  const [pendingAnchorJson, setPendingAnchorJson] = useState<string | null>(null);
  const [editAnchorJson, setEditAnchorJson] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioTimestamp, setAudioTimestamp] = useState<string>('');
  const [audioTimestampEnd, setAudioTimestampEnd] = useState<string>('');
  const [audioFileId, setAudioFileId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // Just-deleted hotspot, kept briefly so the deletion can be undone (re-created).
  const [undoHotspot, setUndoHotspot] = useState<ArtworkHotspot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the previously-selected hotspot id so the effect only fires on change
  const prevSelectedId = useRef<string | null>(null);

  // Clear the pending undo timer if the editor unmounts.
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  // Drag-to-reposition state for the currently-selected hotspot pin.
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const pointerToPercent = (clientX: number, clientY: number) => {
    const rect = imageWrapperRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

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
        setTransitionSavedMsg('Transition saved');
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
    setDragXY(null);
    setNewPin({ x: clampedX, y: clampedY });
    setIsConfirmingDelete(false);
    setTitle('');
    setDescription('');
    setAudioTimestamp('');
    setAudioTimestampEnd('');
    setAudioFileId('');
  };

  // Populate edit fields when an existing hotspot is selected
  useEffect(() => {
    if (!selectedHotspot || selectedHotspot.id === prevSelectedId.current) return;
    prevSelectedId.current = selectedHotspot.id;
    setDragXY(null);
    setIsConfirmingDelete(false);
    setTitle(selectedHotspot.title);
    setDescription(selectedHotspot.description);
    setAudioTimestamp(selectedHotspot.audio_timestamp_seconds != null ? String(selectedHotspot.audio_timestamp_seconds) : '');
    setAudioTimestampEnd(selectedHotspot.audio_timestamp_end_seconds != null ? String(selectedHotspot.audio_timestamp_end_seconds) : '');
    setAudioFileId(selectedHotspot.audio_file_id ?? '');
    setEditAnchorJson(selectedHotspot.anchor_3d_json ?? null);
  }, [selectedHotspot]);

  // MODEL_3D: a click on the model surface either opens the "new hotspot" form
  // (no hotspot currently selected) or repositions the anchor for the hotspot
  // being edited — mirroring the 2D drag-to-reposition behavior.
  const handleDropHotspot3D = (anchorJson: string) => {
    if (selectedHotspot) {
      setEditAnchorJson(anchorJson);
      return;
    }
    setSelectedHotspot(null);
    setPendingAnchorJson(anchorJson);
    setIsConfirmingDelete(false);
    setTitle('');
    setDescription('');
    setAudioTimestamp('');
    setAudioTimestampEnd('');
    setAudioFileId('');
  };

  const handleUpdateHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotspot) return;
    setSaving(true);
    const cleanAudioId = audioFileId.trim();
    const match = cleanAudioId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanAudioId.match(/id=([a-zA-Z0-9_-]+)/);
    const resolvedAudioId = match ? match[1] : cleanAudioId;
    try {
      const res = await fetch(`/api/hotspots/${selectedHotspot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim() || 'Detail Hotspot',
          description: description.trim(),
          audio_timestamp_seconds: audioTimestamp.trim() ? parseFloat(audioTimestamp) : null,
          audio_timestamp_end_seconds: audioTimestampEnd.trim() ? parseFloat(audioTimestampEnd) : null,
          audio_file_id: resolvedAudioId || null,
          ...(is3D
            ? // Persist the (possibly re-dropped) 3D anchor; fall back to the
              // existing one so a text-only save doesn't clear it.
              { anchor_3d_json: editAnchorJson ?? selectedHotspot.anchor_3d_json }
            : {
                // Persist the (possibly dragged) pin position.
                x_percent: dragXY?.x ?? selectedHotspot.x_percent,
                y_percent: dragXY?.y ?? selectedHotspot.y_percent,
              }),
        }),
      });
      if (!res.ok) {
        toast.error(`Lỗi cập nhật điểm chi tiết: ${await res.text()}`);
        return;
      }
      const updated = (await res.json()) as ArtworkHotspot;
      onHotspotsUpdated(hotspots.map((h) => (h.id === updated.id ? updated : h)));
      setSelectedHotspot(updated);
      prevSelectedId.current = updated.id;
      toast.success(`Đã lưu thay đổi điểm chi tiết "${updated.title}".`);
    } catch {
      toast.error('Lỗi kết nối khi cập nhật điểm chi tiết.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateHotspot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (is3D ? !pendingAnchorJson : !newPin) return;
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
          ...(is3D
            ? { anchor_3d_json: pendingAnchorJson }
            : { x_percent: newPin!.x, y_percent: newPin!.y }),
          title: title.trim() || 'Detail Hotspot',
          description: description.trim(),
          audio_timestamp_seconds: audioTimestamp.trim()
            ? parseFloat(audioTimestamp)
            : null,
          audio_timestamp_end_seconds: audioTimestampEnd.trim()
            ? parseFloat(audioTimestampEnd)
            : null,
          audio_file_id: resolvedAudioId || null,
        }),
      });

      if (!res.ok) {
        toast.error(`Lỗi tạo điểm chi tiết: ${await res.text()}`);
        return;
      }

      const created = (await res.json()) as ArtworkHotspot;
      onHotspotsUpdated([...hotspots, created]);
      toast.success(`Đã thêm điểm chi tiết "${created.title || 'Detail'}".`);
      setNewPin(null);
      setPendingAnchorJson(null);
      setTitle('');
      setDescription('');
      setAudioTimestamp('');
      setAudioTimestampEnd('');
      setAudioFileId('');
    } catch {
      toast.error('Lỗi kết nối khi tạo điểm chi tiết.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHotspot = async (id: string) => {
    const removed = hotspots.find((h) => h.id === id) ?? null;
    setSaving(true);
    try {
      const res = await fetch(`/api/hotspots/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onHotspotsUpdated(hotspots.filter((h) => h.id !== id));
        setSelectedHotspot(null);
        setIsConfirmingDelete(false);
        // Offer an undo window: keep the deleted hotspot's data for a few seconds.
        if (removed) {
          setUndoHotspot(removed);
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          undoTimerRef.current = setTimeout(() => setUndoHotspot(null), 6000);
        }
      } else {
        toast.error('Không thể xóa điểm chi tiết.');
      }
    } catch {
      toast.error('Lỗi kết nối khi xóa điểm chi tiết.');
    } finally {
      setSaving(false);
    }
  };

  // Re-create the just-deleted hotspot (new id) — restores position, text, and audio.
  const handleUndoDelete = async () => {
    const h = undoHotspot;
    if (!h) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoHotspot(null);
    try {
      const res = await fetch('/api/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          artwork_id: artwork.id,
          x_percent: h.x_percent,
          y_percent: h.y_percent,
          title: h.title,
          description: h.description,
          audio_timestamp_seconds: h.audio_timestamp_seconds ?? null,
          audio_timestamp_end_seconds: h.audio_timestamp_end_seconds ?? null,
          audio_file_id: h.audio_file_id ?? null,
        }),
      });
      if (res.ok) {
        const restored = (await res.json()) as ArtworkHotspot;
        onHotspotsUpdated([...hotspots, restored]);
        toast.success(`Đã khôi phục điểm chi tiết "${restored.title}".`);
      } else {
        toast.error('Không thể khôi phục điểm chi tiết.');
      }
    } catch {
      toast.error('Lỗi kết nối khi khôi phục điểm chi tiết.');
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
          <button
            type="button"
            className="hotspot-editor-close"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: 'none',
              border: '1px solid var(--reda-parch-border)',
              color: 'var(--reda-muted)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="close" size={16} />
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
            backgroundColor: 'var(--reda-parch-2)',
            border: '1px solid var(--reda-parch-border)',
            borderRadius: 'var(--reda-radius)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label
                htmlFor="hotspot-anim-select"
                style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--reda-ink)', whiteSpace: 'nowrap' }}
              >
                Transition Animation:
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

              {savingTransition && <span style={{ fontSize: '0.85rem', color: 'var(--reda-ink-2)' }}>Saving…</span>}
              {transitionSavedMsg && (
                <span style={{ fontSize: '0.85rem', color: 'var(--reda-sage)', fontWeight: 600 }}>
                  {transitionSavedMsg}
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--reda-ink-2)' }}>
              {getHotspotAnimation(transitionStyle).description}
            </p>
          </div>

          <HotspotTransitionPreview transition={transitionStyle} />
        </div>

        {/* MODEL_3D: existing hotspots live in a scrollable strip ABOVE the
            preview, so the right sidebar is only for editing one hotspot's info. */}
        {is3D && hotspots.length > 0 && (
          <div className="hotspot-3d-strip">
            <span className="hotspot-3d-strip__label">Existing Hotspots ({hotspots.length})</span>
            <div className="hotspot-3d-strip__chips">
              {hotspots.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`hotspot-3d-chip ${selectedHotspot?.id === h.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedHotspot(h); setPendingAnchorJson(null); setNewPin(null); }}
                >
                  {h.title || 'Untitled hotspot'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="hotspot-editor-layout">
          {/* Visual Image/Model View with Pins */}
          <div className="hotspot-canvas-container">
            {is3D ? (
              <Model3DHotspotEditor
                fullModelFileId={artwork.media_file_id ?? ''}
                version={artwork.updated_at}
                existingAnchors={hotspots}
                onDropHotspot={handleDropHotspot3D}
              />
            ) : (
              <>
            <p className="canvas-instruction">
              Click anywhere on the artwork image to drop a new interpretive hotspot pin.
            </p>
            {imgSrc ? (
              <div className="hotspot-image-wrapper" ref={imageWrapperRef} onClick={handleImageClick}>
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
                {hotspots.map((h) => {
                  const isSelected = selectedHotspot?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      className={`hotspot-pin ${isSelected ? 'selected on' : ''}`}
                      style={{
                        position: 'absolute',
                        left: `${isSelected && dragXY ? dragXY.x : h.x_percent}%`,
                        top: `${isSelected && dragXY ? dragXY.y : h.y_percent}%`,
                        transform: 'translate(-50%, -50%)',
                        width: isSelected ? '28px' : '22px',
                        height: isSelected ? '28px' : '22px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--reda-cham-hi)' : 'var(--reda-cham)',
                        border: isSelected ? '3px solid var(--reda-cream-hi)' : '2px solid #fff',
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(78, 114, 134, 0.4), 0 3px 8px rgba(0,0,0,0.5)'
                          : '0 2px 6px rgba(0,0,0,0.4)',
                        cursor: isSelected ? 'grab' : 'pointer',
                        touchAction: 'none',
                        padding: 0,
                        zIndex: isSelected ? 12 : 10,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewPin(null);
                        setSelectedHotspot(h);
                      }}
                      onPointerDown={(e) => {
                        // Only the selected pin is draggable; others just select on click.
                        if (!isSelected) return;
                        e.stopPropagation();
                        draggingRef.current = true;
                        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
                      }}
                      onPointerMove={(e) => {
                        if (!draggingRef.current || !isSelected) return;
                        const p = pointerToPercent(e.clientX, e.clientY);
                        if (p) setDragXY(p);
                      }}
                      onPointerUp={(e) => {
                        if (!draggingRef.current) return;
                        draggingRef.current = false;
                        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
                      }}
                      title={isSelected ? 'Drag to reposition' : h.title}
                    >
                      <span className="hotspot-pin__dot" />
                    </button>
                  );
                })}

                {/* Newly Placed Pin Indicator */}
                {newPin && (
                  <div
                    className="hotspot-pin new-pin"
                    style={{
                      position: 'absolute',
                      left: `${newPin.x}%`,
                      top: `${newPin.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--reda-cham-hi)',
                      border: '3px solid var(--reda-gold)',
                      boxShadow: '0 0 0 3px rgba(201, 163, 91, 0.4), 0 3px 8px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      zIndex: 15,
                    }}
                  >
                    <span className="hotspot-pin__dot" />
                  </div>
                )}
              </div>
            ) : (
              <p>No image file associated with this artwork.</p>
            )}
              </>
            )}

            {/* Done button lives under the canvas (matches mockup .done) */}
            <button type="button" className="hotspot-done-btn" onClick={onClose}>
              Done Editing Hotspots
            </button>
          </div>

          {/* Hotspot Form & Details Panel */}
          <div className="hotspot-sidebar">
            {(is3D ? pendingAnchorJson : newPin) && (
              <form onSubmit={handleCreateHotspot} className="hotspot-pin-form">
                <h3>New Hotspot Pin</h3>
                <p className="coords-readout">
                  {is3D ? 'Location: dropped on 3D model surface' : `Location: X: ${newPin!.x}%, Y: ${newPin!.y}%`}
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
                    Option A: Audio Guide Segment (Seconds)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      id="hs-seek"
                      type="number"
                      step="0.1"
                      min="0"
                      value={audioTimestamp}
                      onChange={(e) => setAudioTimestamp(e.target.value)}
                      placeholder="Start (e.g. 42.5)"
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <span style={{ color: 'var(--reda-ink-2)', fontSize: '0.85rem' }}>to</span>
                    <input
                      id="hs-seek-end"
                      type="number"
                      step="0.1"
                      min="0"
                      value={audioTimestampEnd}
                      onChange={(e) => setAudioTimestampEnd(e.target.value)}
                      placeholder="Stop (optional)"
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </div>
                  <p className="hint">
                    Jump to a point in the main audio guide. Leave Stop empty to play to the end.
                  </p>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="hs-audio" className="form-label" style={{ marginBottom: 0 }}>
                      Option B: Dedicated Audio File Link (Google Drive / URL)
                    </label>
                    <DriveFilePicker
                      mimeTypes="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
                      isTeam={isTeam}
                      buttonLabel="Pick Audio from Google Drive"
                      onPicked={(fileId) => setAudioFileId(fileId)}
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
                    You can provide a dedicated audio clip narration specific to this hotspot.
                  </p>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '20px' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setNewPin(null); setPendingAnchorJson(null); }}
                    style={{ borderRadius: 'var(--reda-radius-pill)' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    style={{ borderRadius: 'var(--reda-radius-pill)', marginLeft: 'auto' }}
                  >
                    {saving ? 'Saving…' : 'Add Hotspot Pin'}
                  </Button>
                </div>
              </form>
            )}

            {selectedHotspot && !(is3D ? pendingAnchorJson : newPin) && (
              <form onSubmit={handleUpdateHotspot} className="hotspot-pin-form">
                <h3>Edit Hotspot</h3>
                <p className="coords-readout">
                  {is3D
                    ? 'Pin anchored to 3D model surface'
                    : `Pin at: X: ${dragXY?.x ?? selectedHotspot.x_percent}%, Y: ${dragXY?.y ?? selectedHotspot.y_percent}%`}
                </p>
                <p className="hint" style={{ marginTop: '-2px' }}>
                  {is3D
                    ? 'Click a new spot on the 3D model to move this pin, then Save Changes.'
                    : 'Drag the highlighted pin on the image to reposition it, then Save Changes.'}
                </p>

                <div className="form-group">
                  <label htmlFor="hs-edit-title" className="form-label">Hotspot Title</label>
                  <input
                    id="hs-edit-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hs-edit-desc" className="form-label">Interpretive Text</label>
                  <textarea
                    id="hs-edit-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="input textarea"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hs-edit-seek" className="form-label">
                    Option A: Audio Guide Segment (Seconds)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      id="hs-edit-seek"
                      type="number"
                      step="0.1"
                      min="0"
                      value={audioTimestamp}
                      onChange={(e) => setAudioTimestamp(e.target.value)}
                      placeholder="Start (e.g. 42.5)"
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <span style={{ color: 'var(--reda-ink-2)', fontSize: '0.85rem' }}>to</span>
                    <input
                      id="hs-edit-seek-end"
                      type="number"
                      step="0.1"
                      min="0"
                      value={audioTimestampEnd}
                      onChange={(e) => setAudioTimestampEnd(e.target.value)}
                      placeholder="Stop (optional)"
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label htmlFor="hs-edit-audio" className="form-label" style={{ marginBottom: 0 }}>
                      Option B: Dedicated Audio File
                    </label>
                    <DriveFilePicker
                      mimeTypes="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
                      isTeam={isTeam}
                      buttonLabel="Pick from Drive"
                      onPicked={(fileId) => setAudioFileId(fileId)}
                    />
                  </div>
                  <input
                    id="hs-edit-audio"
                    type="text"
                    value={audioFileId}
                    onChange={(e) => setAudioFileId(e.target.value)}
                    placeholder="Google Drive link or direct URL"
                    className="input"
                  />
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '20px' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setSelectedHotspot(null); prevSelectedId.current = null; setIsConfirmingDelete(false); }}
                    style={{ borderRadius: 'var(--reda-radius-pill)' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      if (!isConfirmingDelete) {
                        setIsConfirmingDelete(true);
                      } else {
                        handleDeleteHotspot(selectedHotspot.id);
                      }
                    }}
                    disabled={saving}
                    style={{ borderRadius: 'var(--reda-radius-pill)' }}
                  >
                    {isConfirmingDelete ? 'Confirm Delete?' : 'Delete'}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    style={{ borderRadius: 'var(--reda-radius-pill)', marginLeft: 'auto' }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}

            {!(is3D ? pendingAnchorJson : newPin) && !selectedHotspot && (
              <div className="hotspot-empty-state">
                <p>
                  {is3D
                    ? 'Click on the 3D model to place a new pin, or select an existing pin to edit or delete it.'
                    : 'Click on the image to place a new pin, or click an existing pin to edit or delete it.'}
                </p>
                <p>Total hotspots on this artwork: {hotspots.length}</p>
              </div>
            )}
          </div>
        </div>

        {undoHotspot && (
          <div className="hotspot-undo-bar" role="status" aria-live="polite">
            <span className="hotspot-undo-bar__msg">
              Deleted “{undoHotspot.title || 'hotspot'}”
            </span>
            <button
              type="button"
              className="hotspot-undo-bar__btn"
              onClick={handleUndoDelete}
            >
              <Icon name="reset" size={13} /> Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
