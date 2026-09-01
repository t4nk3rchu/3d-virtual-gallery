import { Icon } from '../../ui';
import type { Artist } from '../../../types/schema';

export function ArtistsPane({
  artists,
  selectedId,
  onSelect,
  onAdd,
}: {
  artists: Artist[];
  selectedId: string | null;
  onSelect(id: string): void;
  onAdd(): void;
}) {
  return (
    <div className="wb-pane">
      <div className="wb-ph">
        <h3>Artists</h3>
        <button
          type="button"
          className="add"
          onClick={onAdd}
          aria-label="Add artist"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
      <div className="wb-list">
        {artists.map((a) => (
          <button
            key={a.id}
            type="button"
            className="wb-li"
            aria-selected={a.id === selectedId}
            onClick={() => onSelect(a.id)}
          >
            <span className="pf">
              <Icon name="users" size={15} />
            </span>
            <span className="meta">
              <b>{a.name}</b>
              <span>{a.life_dates || 'No dates'}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
