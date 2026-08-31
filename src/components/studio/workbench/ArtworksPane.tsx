import { useState } from 'react';
import { Icon } from '../../ui';
import type { Artwork, Room, Artist } from '../../../types/schema';
import { getImageUrl } from '../../../lib/media/gdrive';
import { isArtworkPlaced } from '../../../lib/studio/artwork-placement';

export function ArtworksPane({
  artworks,
  artists = [],
  rooms,
  selectedId,
  onSelect,
  onAdd,
}: {
  artworks: Artwork[];
  artists?: Artist[];
  rooms: Room[];
  selectedId: string | null;
  onSelect(id: string): void;
  onAdd(): void;
}) {
  void rooms;
  const [tab, setTab] = useState<'in_room' | 'storage'>('in_room');
  const [selectedArtistFilter, setSelectedArtistFilter] = useState<string>('all');

  const inRoomArtworks = artworks.filter((a) => isArtworkPlaced(a));
  const storageArtworks = artworks.filter((a) => !isArtworkPlaced(a));
  const baseList = tab === 'in_room' ? inRoomArtworks : storageArtworks;

  const displayedArtworks = baseList.filter((a) => {
    if (selectedArtistFilter === 'all') return true;
    if (selectedArtistFilter === 'unassigned') {
      return !a.artist_id && !a.artist;
    }
    const matchingArtist = artists.find((art) => art.id === selectedArtistFilter);
    return (
      a.artist_id === selectedArtistFilter ||
      (matchingArtist && a.artist === matchingArtist.name)
    );
  });

  return (
    <div className="wb-pane">
      <div className="wb-ph">
        <h3>Artworks</h3>
        <button
          type="button"
          className="add"
          onClick={onAdd}
          aria-label="Add artwork"
          title="Add new artwork"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>

      <div className="wb-seg" role="tablist" aria-label="Artwork placement status">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'in_room'}
          aria-pressed={tab === 'in_room'}
          onClick={() => setTab('in_room')}
          title="Artworks currently positioned on walls in the 3D room"
        >
          In Room ({inRoomArtworks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'storage'}
          aria-pressed={tab === 'storage'}
          onClick={() => setTab('storage')}
          title="Artworks stored for later placement"
        >
          Storage ({storageArtworks.length})
        </button>
      </div>

      {artists.length > 0 && (
        <div style={{ padding: '0 12px 8px' }}>
          <select
            value={selectedArtistFilter}
            onChange={(e) => setSelectedArtistFilter(e.target.value)}
            className="select"
            style={{
              width: '100%',
              fontSize: '11px',
              fontFamily: 'var(--reda-ui)',
              fontWeight: 500,
              padding: '6px 8px',
              background: 'var(--reda-char-3)',
              color: 'var(--reda-cream)',
              border: '1px solid var(--reda-line)',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer',
            }}
            title="Filter artworks by artist"
          >
            <option value="all">Filter: All Artists ({artworks.length})</option>
            {artists.map((art) => {
              const count = artworks.filter(
                (a) => a.artist_id === art.id || a.artist === art.name
              ).length;
              return (
                <option key={art.id} value={art.id}>
                  {art.name} ({count})
                </option>
              );
            })}
            {artworks.some((a) => !a.artist_id && !a.artist) && (
              <option value="unassigned">
                Unassigned (
                {artworks.filter((a) => !a.artist_id && !a.artist).length}
                )
              </option>
            )}
          </select>
        </div>
      )}

      <div className="wb-list">
        {displayedArtworks.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--reda-muted-2)', fontSize: '11.5px', lineHeight: 1.5 }}>
            {selectedArtistFilter !== 'all'
              ? 'No artworks match the selected artist filter in this tab.'
              : tab === 'in_room'
              ? 'No artworks in the room. Place an artwork from Storage or click + to add.'
              : 'No stored artworks. Artworks moved from the room will appear here.'}
          </div>
        ) : (
          displayedArtworks.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className="wb-li"
              aria-selected={a.id === selectedId}
              onClick={() => onSelect(a.id)}
            >
              <span className="no">{String(i + 1).padStart(2, '0')}</span>
              <span
                className="th"
                style={{
                  backgroundImage: a.media_file_id
                    ? `url(${getImageUrl(a.media_file_id, 'thumbnail')})`
                    : undefined,
                }}
              />
              <span className="meta">
                <b>{a.title}</b>
                <span>{a.medium || a.artwork_type}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
