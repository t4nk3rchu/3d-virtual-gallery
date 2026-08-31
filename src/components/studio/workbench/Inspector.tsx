import { ArtworkForm } from '../ArtworkForm';
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
          <div className="k">Artwork · catalogue</div>
          <h3>{art?.title ?? 'New artwork'}</h3>
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
            padding: '4px',
            borderRadius: '4px',
            fontSize: '18px',
            lineHeight: 1,
          }}
        >
          ×
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
