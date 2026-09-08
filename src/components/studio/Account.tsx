import { useState, type FormEvent } from 'react';
import { Icon } from '../ui';

export interface CuratorUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_team?: boolean;
}

export interface AccountProps {
  user: CuratorUser;
  onBack(): void;
}

export function Account({ user, onBack }: AccountProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    Boolean(currentPassword) &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !loading;

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to update password. Please check your current password.');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initial = (user.full_name || user.email || 'A')[0].toUpperCase();

  return (
    <div className="account-page">
      <header className="account-top" role="banner">
        <div className="account-brand">
          <img
            src="/reda_logo.png"
            alt="Reda Gallery"
            className="account-logo"
          />
          <div>
            <div className="account-mark">REDA GALLERY · ARCHIVE &amp; STUDIO</div>
            <div className="account-sub">Curator account management</div>
          </div>
        </div>
        <nav className="account-nav">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onBack}
            aria-label="Back to dashboard"
          >
            <Icon name="chevronLeft" size={15} />
            <span>Back to exhibitions</span>
          </button>
        </nav>
      </header>

      <main className="account-wrap" id="account-main">
        <header className="account-head">
          <h1>Your account</h1>
          <p className="account-desc">Personal information, curator profile, and security settings.</p>
        </header>

        {/* Profile Information Panel */}
        <section className="account-panel" aria-labelledby="panel-profile">
          <h2 className="account-panel-title" id="panel-profile">Profile information</h2>
          <div className="account-avatar-row">
            <div className="account-avatar" aria-hidden="true">
              {initial}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--reda-ink)' }}>
                {user.full_name || 'Curator'}
              </div>
              <div className="hint">
                {user.role ? `Role: ${user.role}` : 'Curator profile'}
              </div>
            </div>
          </div>

          <div className="account-two">
            <div className="account-field">
              <label htmlFor="acc-name">Full name</label>
              <input id="acc-name" value={user.full_name || ''} readOnly />
            </div>
            <div className="account-field">
              <label htmlFor="acc-email">Email</label>
              <input id="acc-email" value={user.email} readOnly />
              <div className="hint">Email used for signing in; cannot be changed.</div>
            </div>
          </div>
        </section>

        {/* Security Panel */}
        <section className="account-panel" aria-labelledby="panel-security">
          <h2 className="account-panel-title" id="panel-security">Security</h2>

          {error && (
            <div className="account-alert account-alert--error" role="alert">
              <Icon name="info" size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="account-alert account-alert--success" role="status">
              <Icon name="info" size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="account-field">
              <label htmlFor="pw-curr">Current password</label>
              <input
                id="pw-curr"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="account-two">
              <div className="account-field">
                <label htmlFor="pw-new">New password</label>
                <input
                  id="pw-new"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <div className="hint">At least 8 characters.</div>
              </div>

              <div className={`account-field ${isMismatch ? 'error' : ''}`} id="pw-cf-field">
                <label htmlFor="pw-cf">Confirm new password</label>
                <input
                  id="pw-cf"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {isMismatch && <div className="err">Passwords don't match.</div>}
              </div>
            </div>

            <div className="account-saverow">
              <button
                type="submit"
                className="btn btn--primary"
                id="pw-save"
                disabled={!canSubmit}
              >
                {loading ? 'Updating password…' : 'Change password'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
