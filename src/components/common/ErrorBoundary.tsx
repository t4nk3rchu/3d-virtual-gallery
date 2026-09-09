import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="reda-scope reda-dark"
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--reda-cream, #ECE6DA)',
            background: 'var(--reda-char, #0E0D0A)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--reda-ui)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--reda-display)',
              fontWeight: 500,
              fontSize: 'clamp(24px, 4vw, 36px)',
              marginBottom: '1rem',
              color: 'var(--reda-cream-hi, #F5EFE1)',
              letterSpacing: '0.02em',
            }}
          >
            Đã xảy ra lỗi kết nối
          </h2>
          <p
            style={{
              fontFamily: 'var(--reda-text)',
              color: 'var(--reda-muted, #B0A78F)',
              marginBottom: '2rem',
              maxWidth: '460px',
              lineHeight: 1.6,
              fontSize: '14.5px',
            }}
          >
            {this.state.error?.message || 'Không thể hiển thị không gian triển lãm. Vui lòng tải lại.'}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            style={{
              background: 'var(--reda-son, #B23A22)',
              color: 'var(--reda-cream-hi, #F5EFE1)',
              border: '1px solid var(--reda-son-hi, #C4442A)',
              borderRadius: 'var(--reda-radius-pill, 999px)',
              padding: '10px 24px',
              fontFamily: 'var(--reda-ui)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'background 0.15s ease',
            }}
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
