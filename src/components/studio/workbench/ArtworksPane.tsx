import { useState } from 'react';
import { Icon } from '../../ui';
import type { Artwork, Room } from '../../../types/schema';
import { getImageUrl } from '../../../lib/media/gdrive';
import { isArtworkPlaced } from '../../../lib/studio/artwork-placement';

export function ArtworksPane({
  artworks,
  rooms,
  selectedId,
  onSelect,
  onAdd,
}: {
  artworks: Artwork[];
  rooms: Room[];
  selectedId: string | null;
  onSelect(id: string): void;
  onAdd(): void;
}) {
  void rooms;
  const [tab, setTab] = useState<'in_room' | 'storage'>('in_room');

  const inRoomArtworks = artworks.filter((a) => isArtworkPlaced(a));
  const storageArtworks = artworks.filter((a) => !isArtworkPlaced(a));
  const displayedArtworks = tab === 'in_room' ? inRoomArtworks : storageArtworks;

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

      <div className="wb-list">
        {displayedArtworks.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--reda-muted-2)', fontSize: '11.5px', lineHeight: 1.5 }}>
            {tab === 'in_room'
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
