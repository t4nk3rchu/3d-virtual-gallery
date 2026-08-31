import { Button, Icon } from '../../ui';

export type Mode = 'artworks' | 'waypoints' | 'walk';

const MODE_ITEMS: { id: Mode; label: string; title: string }[] = [
  { id: 'artworks', label: 'Artworks', title: 'Position, rotate, and scale artworks on walls' },
  { id: 'waypoints', label: 'Waypoints', title: 'Place and fine-tune start point and tour waypoints' },
  { id: 'walk', label: 'Walkthrough', title: 'Test the 3D gallery with visitor eye height and gravity' },
];

export function WorkbenchTopBar({
  title,
  isPublished,
  mode,
  onMode,
  saving,
  onPublish,
  onUnpublish,
  onBack,
  previewHref,
}: {
  title: string;
  isPublished: boolean;
  mode: Mode;
  onMode(m: Mode): void;
  saving: boolean;
  onPublish(): void;
  onUnpublish(): void;
  onBack(): void;
  previewHref: string;
}) {
  return (
    <div className="wb-top">
      <div className="l">
        <button
          type="button"
          onClick={onBack}
          className="wb-brand-btn"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Return to Exhibitions Dashboard"
        >
          <span className="wb-brand">REDA</span>
        </button>
        <div className="wb-crumb">
          <button
            type="button"
            onClick={onBack}
            className="wb-crumb-btn"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--reda-muted)',
              fontFamily: 'inherit',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Return to Exhibitions Dashboard"
          >
            <Icon name="chevronLeft" size={13} />
            <span>Exhibitions</span>
          </button>
          <span className="sep">/</span>
          <span className="cur">{title}</span>
        </div>
      </div>
      <div className="wb-pill" role="group" aria-label="View mode">
        {MODE_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === mode}
            onClick={() => onMode(item.id)}
            title={item.title}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="r">
        <span className="wb-saved">
          <i /> Saved
        </span>
        <a
          className="btn btn--ghost btn--sm"
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          Preview <Icon name="external" size={12} />
        </a>
        {isPublished ? (
          <Button variant="ghost" size="sm" disabled={saving} onClick={onUnpublish}>
            Unpublish
          </Button>
        ) : (
          <Button variant="primary" size="sm" disabled={saving} onClick={onPublish}>
            {saving ? 'Publishing…' : 'Publish'}
          </Button>
        )}
        <button
          type="button"
          className="wb-ava"
          onClick={onBack}
          title="Dashboard"
          aria-label="Dashboard"
        >
          R
        </button>
      </div>
    </div>
  );
}
