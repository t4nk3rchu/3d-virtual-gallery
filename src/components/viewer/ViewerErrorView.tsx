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
  let defaultTitle = 'Không tìm thấy triển lãm';
  let defaultMessage =
    'Liên kết triển lãm không tồn tại hoặc đã được chuyển sang phòng trưng bày khác.';
  let iconName: 'info' | 'lock' | 'refresh' = 'info';

  if (type === 'private') {
    defaultTitle = 'Triển lãm riêng tư';
    defaultMessage =
      'Triển lãm này hiện đang trong quá trình chuẩn bị hoặc chỉ mở cho người được ủy quyền.';
    iconName = 'lock';
  } else if (type === 'network_error') {
    defaultTitle = 'Lỗi kết nối không gian';
    defaultMessage =
      'Không thể tải dữ liệu không gian triển lãm. Vui lòng kiểm tra đường truyền và thử lại.';
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

        <h1 className="viewer-error-card__title">{displayTitle}</h1>

        <p className="viewer-error-card__message">{displayMessage}</p>

        {/* Action Buttons */}
        <div className="viewer-error-card__actions">
          {type === 'not_found' && (
            <>
              <a href="/" className="btn btn--primary viewer-error-btn">
                Quay lại trang chủ
              </a>
              <a href="/studio" className="btn btn--secondary viewer-error-btn">
                Đăng nhập Studio
              </a>
            </>
          )}

          {type === 'private' && (
            <>
              <a href="/studio" className="btn btn--primary viewer-error-btn">
                Đăng nhập Studio <Icon name="chevronRight" size={14} />
              </a>
              <a href="/" className="btn btn--secondary viewer-error-btn">
                Quay lại trang chủ
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
                  <Icon name="refresh" size={14} /> Thử lại kết nối
                </button>
              )}
              <a href="/" className="btn btn--secondary viewer-error-btn">
                Quay lại trang chủ
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
