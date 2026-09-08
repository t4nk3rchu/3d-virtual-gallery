import { ArtworkForm } from '../ArtworkForm';
import { Icon } from '../../ui';
import type { Artwork, Artist } from '../../../types/schema';

interface InspectorProps {
  width?: number;
  exhibitionId: string;
  selected: string | null;
  artworks: Artwork[];
  artists: Artist[];
  isTeam?: boolean;
  onResizeStart?(e: React.MouseEvent): void;
  onEditHotspots?(artwork: Artwork): void;
  onSaved(): void;
  onDeselect(): void;
  onDelete?(artworkId: string): void;
}

export function Inspector({
  width,
  exhibitionId,
  selected,
  artworks,
  artists,
  isTeam,
  onResizeStart,
  onEditHotspots,
  onSaved,
  onDeselect,
  onDelete,
}: InspectorProps) {
  if (!selected) {
    return null;
  }

  const art = selected === 'new' ? null : artworks.find((a) => a.id === selected) ?? null;

  return (
    <div className="wb-insp" style={{ width: width ? `${width}px` : undefined }}>
      {onResizeStart && (
        <div
          className="wb-resizer"
          onMouseDown={onResizeStart}
          title="Drag to resize inspector width"
        />
      )}
      <div className="ih" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>{art?.title ?? 'New artwork'}</h3>
          {art && (art.medium || art.year) && (
            <div className="ih-sub">{[art.medium, art.year].filter(Boolean).join(' · ')}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="wb-close-btn"
          aria-label="Close inspector"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--reda-ink-2)',
            cursor: 'pointer',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="body">
        <ArtworkForm
          key={selected || 'new'}
          embedded
          exhibitionId={exhibitionId}
          artwork={selected === 'new' ? 'new' : art}
          artists={artists}
          isTeam={isTeam}
          onEditHotspots={onEditHotspots}
          onSaved={onSaved}
          onDelete={(id) => {
            onDelete?.(id);
            onDeselect();
            onSaved();
          }}
          onCancel={onDeselect}
        />
      </div>
    </div>
  );
}
