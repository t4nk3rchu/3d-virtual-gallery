import { Icon } from '../ui';

export type ViewerErrorType = 'not_found' | 'private' | 'network_error';

export interface ViewerErrorViewProps {
  type?: ViewerErrorType;
  title?: string;
  message?: string;
  onRetry?(): void;
}

export function ViewerErrorView({
  type = 'not_found',
  title,
  message,
  onRetry,
}: ViewerErrorViewProps) {
  let kicker = 'Reda Archival Register · Error 404';
  let defaultTitle = 'Exhibition Folio Not Found';
  let defaultMessage =
    'The requested exhibition link does not correspond to an active exhibition folio in the gallery vault.';
  let iconName: 'info' | 'lock' | 'refresh' = 'info';

  if (type === 'private') {
    kicker = 'Curatorial Salon · Access Required';
    defaultTitle = 'Private Exhibition in Curation';
    defaultMessage =
      'This exhibition folio is currently unpublished and accessible only to authorized estate curators.';
    iconName = 'lock';
  } else if (type === 'network_error') {
    kicker = 'Connection Degraded';
    defaultTitle = 'Archival Vault Unreachable';
    defaultMessage =
      'Unable to stream exhibition assets from the vault. Please verify your connection and try again.';
    iconName = 'refresh';
  }

  const displayTitle = title || defaultTitle;
  const displayMessage = message || defaultMessage;

  return (
    <main className="viewer-error-view" role="alert" aria-label="Exhibition Error">
      <div className="viewer-error-view__ambient-grid" aria-hidden="true" />
      <div className="viewer-error-view__ambient-glow" aria-hidden="true" />

      <div className="viewer-error-card">
        {/* Emblem or Icon Badge */}
        <div className="viewer-error-card__emblem-wrap">
          <Icon name={iconName} size={28} />
        </div>

        <span className="viewer-error-card__kicker">{kicker}</span>

        <h1 className="viewer-error-card__title">{displayTitle}</h1>

        <p className="viewer-error-card__message">{displayMessage}</p>

        {/* Action Buttons */}
        <div className="viewer-error-card__actions">
          {type === 'not_found' && (
            <>
              <a href="/" className="btn btn--primary viewer-error-btn">
                Return to Safety
              </a>
              <a href="/login" className="btn btn--secondary viewer-error-btn">
                Curator Atelier Login
              </a>
            </>
          )}

          {type === 'private' && (
            <>
              <a href="/login" className="btn btn--primary viewer-error-btn">
                Sign In with Curator Credentials <Icon name="chevronRight" size={14} />
              </a>
              <a href="/" className="btn btn--secondary viewer-error-btn">
                Return to Safety
              </a>
            </>
          )}

          {type === 'network_error' && (
            <>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="btn btn--primary viewer-error-btn"
                >
                  <Icon name="refresh" size={14} /> Retry Connection
                </button>
              )}
              <a href="/" className="btn btn--secondary viewer-error-btn">
                Return to Safety
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
