import { useEffect, useState } from 'react';
import type { ExhibitionDetail, Room, Artwork } from '../../../types/schema';
import { WorkbenchTopBar, type Mode } from './WorkbenchTopBar';
import { StatusBar } from './StatusBar';
import { ToolRail, type Tool } from './ToolRail';
import { ArtworksPane } from './ArtworksPane';
import { ArtistsPane } from './ArtistsPane';
import { GizmoPlacement } from '../GizmoPlacement';
import { Inspector } from './Inspector';
import { ArtistInspector } from './ArtistInspector';
import { ArtistViewerPreview } from './ArtistViewerPreview';
import { SetupSheet } from './SetupSheet';
import { HotspotEditor } from '../HotspotEditor';
import { Icon } from '../../ui';
import { registerMediaTokens } from '../../../lib/media/media-tokens';

export function Workbench({
  exhibitionId,
  isTeam = false,
  onBack,
}: {
  exhibitionId: string;
  isTeam?: boolean;
  onBack(): void;
}) {
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tool, setTool] = useState<Tool>('curate');
  const [mode, setMode] = useState<Mode>('artworks');
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [editingHotspotArtwork, setEditingHotspotArtwork] = useState<Artwork | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState(440);
  const [saving, setSaving] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = inspectorWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX; // Moving left widens panel
      const newWidth = Math.max(340, Math.min(720, startWidth + delta));
      setInspectorWidth(newWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const fetchExhibition = () =>
    fetch(`/api/exhibitions/${exhibitionId}`, { credentials: 'include' })
      .then((r) => r.json() as Promise<ExhibitionDetail>)
      .then((data) => { registerMediaTokens(data.media_tokens); setExhibition(data); })
      .catch(() => {});

  useEffect(() => {
    fetchExhibition();
    fetch('/api/rooms', { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<Room[]>) : []))
      .then(setRooms)
      .catch(() => {});
  }, [exhibitionId]);

  const setPublished = async (v: 0 | 1) => {
    if (!exhibition) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: v }),
      });
      if (res.ok) setExhibition({ ...exhibition, is_published: v });
    } finally {
      setSaving(false);
    }
  };

  if (!exhibition) return <div className="studio-loading reda-dark">Loading workbench…</div>;

  const activeArtist =
    selectedArtistId && selectedArtistId !== 'new'
      ? (exhibition.artists ?? []).find((a) => a.id === selectedArtistId) ?? null
      : null;

  return (
    <div className="wb reda-dark">
      <WorkbenchTopBar
        title={exhibition.title}
        isPublished={!!exhibition.is_published}
        mode={mode}
        onMode={setMode}
        saving={saving}
        onPublish={() => setPublished(1)}
        onUnpublish={() => setPublished(0)}
        onBack={onBack}
        previewHref={`/e/${exhibition.slug}`}
      />
      <div
        className="wb-main"
        style={{
          gridTemplateColumns:
            tool === 'setup'
              ? '60px 210px 1fr'
              : '60px 232px 1fr',
        }}
      >
        <ToolRail active={tool} onChange={setTool} />
        {tool === 'curate' && (
          <ArtworksPane
            artworks={exhibition.artworks ?? []}
            artists={exhibition.artists ?? []}
            rooms={rooms}
            selectedId={selectedArtworkId}
            onSelect={setSelectedArtworkId}
            onAdd={() => setSelectedArtworkId('new')}
          />
        )}
        {tool === 'artists' && (
          <ArtistsPane
            artists={exhibition.artists ?? []}
            selectedId={selectedArtistId}
            onSelect={(id) => setSelectedArtistId(id)}
            onAdd={() => setSelectedArtistId('new')}
          />
        )}
        {tool === 'setup' && (
          <div className="wb-pane">
            <div className="wb-ph">
              <h3>Setup</h3>
            </div>
            <div className="wb-list" style={{ padding: 0 }}>
              <button type="button" className="wb-nav" aria-current="true">
                <Icon name="gear" size={14} /> Identity &amp; Space
              </button>
              <button
                type="button"
                className="wb-nav"
                onClick={() => setTool('artists')}
              >
                <Icon name="users" size={14} /> Artists
              </button>
              <button
                type="button"
                className="wb-nav"
                onClick={() => setTool('curate')}
              >
                <Icon name="select" size={14} /> Curate Room
              </button>
            </div>
          </div>
        )}
        {tool === 'rooms' && (
          <div className="wb-pane">
            <div className="wb-ph">
              <h3>Rooms</h3>
            </div>
            <div className="wb-list">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="wb-li"
                  aria-selected={r.id === (exhibition.room_id || exhibition.room?.id)}
                  onClick={async () => {
                    await fetch(`/api/exhibitions/${exhibitionId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ room_id: r.id }),
                    });
                    fetchExhibition();
                  }}
                >
                  <span className="pf">
                    <Icon name="cube" size={15} />
                  </span>
                  <span className="meta">
                    <b>{r.name}</b>
                    <span>{r.is_public ? 'Public Room' : 'Custom Space'}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Center: Setup Sheet, Artist Bio Preview, or 3D Viewport */}
        {tool === 'setup' ? (
          <SetupSheet
            exhibition={exhibition}
            rooms={rooms}
            isTeam={isTeam}
            onSaved={fetchExhibition}
            onManageArtists={() => setTool('artists')}
          />
        ) : tool === 'artists' ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
              <ArtistViewerPreview
                artist={activeArtist}
                isNew={selectedArtistId === 'new'}
              />
            </div>

            {/* Artist Inspector Side Panel */}
            {selectedArtistId && (
              <ArtistInspector
                width={inspectorWidth}
                exhibitionId={exhibitionId}
                selectedId={selectedArtistId}
                artists={exhibition.artists ?? []}
                artworks={exhibition.artworks ?? []}
                isTeam={isTeam}
                onResizeStart={startResizing}
                onSaved={() => {
                  fetchExhibition();
                }}
                onDeselect={() => setSelectedArtistId(null)}
                onSelectArtwork={(artworkId) => {
                  setTool('curate');
                  setSelectedArtworkId(artworkId);
                  setSelectedArtistId(null);
                }}
              />
            )}
          </div>
        ) : (
          <div className="wb-view">
            <div className="badge-mode">
              {mode === 'waypoints'
                ? 'Waypoints mode · Visitor Path & Start'
                : mode === 'walk'
                ? 'Walkthrough mode · First Person'
                : 'Artworks mode · Placement'}
            </div>
            {exhibition.room && (
              <GizmoPlacement
                embedded
                room={exhibition.room}
                artworks={exhibition.artworks ?? []}
                exhibitionId={exhibitionId}
                settingsJson={exhibition.settings_json}
                workbenchMode={mode}
                initialSelectedArtworkId={
                  selectedArtworkId && selectedArtworkId !== 'new'
                    ? selectedArtworkId
                    : undefined
                }
                onSelectArtwork={(id) => setSelectedArtworkId(id)}
                onArtworkTransformSaved={() => fetchExhibition()}
                onSpawnPointSaved={() => fetchExhibition()}
                onClose={() => {}}
              />
            )}

            {/* Artwork Inspector Overlay directly over 3D Scene */}
            {tool === 'curate' && selectedArtworkId && (
              <Inspector
                width={inspectorWidth}
                exhibitionId={exhibitionId}
                selected={selectedArtworkId}
                artworks={exhibition.artworks ?? []}
                artists={exhibition.artists ?? []}
                isTeam={isTeam}
                onResizeStart={startResizing}
                onEditHotspots={(art) => setEditingHotspotArtwork(art)}
                onSaved={() => {
                  fetchExhibition();
                }}
                onDeselect={() => setSelectedArtworkId(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Hotspot Editor Modal */}
      {editingHotspotArtwork && (
        <HotspotEditor
          artwork={editingHotspotArtwork}
          hotspots={
            (exhibition.artworks ?? []).find((a) => a.id === editingHotspotArtwork.id)?.hotspots ?? []
          }
          isTeam={isTeam}
          onHotspotsUpdated={() => {
            fetchExhibition();
            setEditingHotspotArtwork(null);
          }}
          onClose={() => setEditingHotspotArtwork(null)}
        />
      )}

      <StatusBar
        roomName={exhibition.room?.name ?? '—'}
        workCount={exhibition.artworks?.length ?? 0}
        mode={mode}
        saved="Auto-saved"
      />
    </div>
  );
}
