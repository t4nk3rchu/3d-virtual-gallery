import { useState, useEffect, type FormEvent } from 'react';
import type {
  ExhibitionDetail,
  Room,
} from '../../types/schema';
import { Workbench } from './workbench/Workbench';
import { Icon, Button, TextField, TextArea, SelectField } from '../ui';
import { DriveFilePicker } from './DriveFilePicker';
import { extractGoogleDriveFileId } from '../../lib/media/gdrive';
import { Account } from './Account';
import { ShareModal } from './ShareModal';

type CmsView =
  | { type: 'login' }
  | { type: 'dashboard' }
  | { type: 'editor'; exhibitionId: string }
  | { type: 'new-exhibition' }
  | { type: 'account' };

interface CuratorUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_team?: boolean;
}

// ISO date → "DD.MM.YYYY"; joins a start/end pair as "start — end". Returns '' when neither is set.
function formatDateRange(start?: string | null, end?: string | null): string {
  const fmt = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} — ${b}`;
  return a || b;
}

import { ToastProvider } from '../../context/ToastContext';
import { ToastContainer } from '../ui';

export function StudioApp() {
  const [user, setUser] = useState<CuratorUser | null>(null);
  const [view, setView] = useState<CmsView>({ type: 'login' });
  const [checking, setChecking] = useState(true);

  // Check existing session
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => (r.ok ? ((await r.json()) as CuratorUser) : null))
      .then((u) => {
        if (u) {
          setUser(u);
          setView({ type: 'dashboard' });
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="studio-loading reda-parch" role="status" aria-live="polite">
        <div className="studio-loading__emblem">
          <img
            src="/reda_logo.png"
            alt="Reda Gallery"
            style={{ width: '38px', height: '38px', objectFit: 'contain' }}
          />
        </div>
        <div className="studio-loading__kicker">Reda Atelier</div>
        <div className="studio-loading__text">Connecting to Curator Vault…</div>
        <div className="studio-loading__spinner" />
      </div>
    );
  }

  const renderContent = () => {
    if (!user || view.type === 'login') {
      return (
        <Login
          onLoggedIn={(u) => {
            setUser(u);
            setView({ type: 'dashboard' });
          }}
        />
      );
    }

    if (view.type === 'dashboard') {
      return (
        <Dashboard
          user={user}
          onEdit={(id) => setView({ type: 'editor', exhibitionId: id })}
          onNew={() => setView({ type: 'new-exhibition' })}
          onLogout={() => {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            setUser(null);
            setView({ type: 'login' });
          }}
          onAccount={() => setView({ type: 'account' })}
        />
      );
    }

    if (view.type === 'account') {
      return (
        <Account
          user={user}
          onBack={() => setView({ type: 'dashboard' })}
        />
      );
    }

    if (view.type === 'editor') {
      return (
        <Workbench
          exhibitionId={view.exhibitionId}
          isTeam={user.is_team}
          onBack={() => setView({ type: 'dashboard' })}
        />
      );
    }

    if (view.type === 'new-exhibition') {
      return (
        <NewExhibitionForm
          onCreated={(id) => setView({ type: 'editor', exhibitionId: id })}
          onCancel={() => setView({ type: 'dashboard' })}
        />
      );
    }

    return null;
  };

  return (
    <ToastProvider>
      {renderContent()}
      <ToastContainer />
    </ToastProvider>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

interface LoginProps {
  onLoggedIn(user: CuratorUser): void;
}

function Login({ onLoggedIn }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reda-theme');
        if (saved === 'dark' || saved === 'light') return saved;
      } catch {}
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('reda-theme', next);
    } catch {}
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        mode === 'register'
          ? { email, password, full_name: fullName.trim() || email.split('@')[0] }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        setError(err || `${mode === 'register' ? 'Registration' : 'Login'} failed`);
        return;
      }
      const me = await fetch('/api/auth/me', { credentials: 'include' });
      if (me.ok) {
        onLoggedIn((await me.json()) as CuratorUser);
      } else {
        setError('Authentication succeeded, but failed to verify session. Please try signing in.');
      }
    } catch {
      setError('Network error during authentication. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page" data-theme={theme} aria-labelledby="login-heading">
      <div className="login-ambient-grid" aria-hidden="true" />
      <div className="login-ambient-glow" aria-hidden="true" />

      <div className="login-card-container">
        <div className="login-card">
          <button
            type="button"
            id="themeToggle"
            className="theme-toggle"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>

          <header className="login-card__header">
            <div className="login-emblem-wrap">
              <img
                src="/reda_logo.png"
                alt="Reda Gallery"
                className="login-emblem"
              />
            </div>
            <span className="login-kicker">Reda Gallery · Archival Studio</span>
            <h1 id="login-heading" className="login-card__title">
              {mode === 'login' ? 'Curator Atelier' : 'Create Access'}
            </h1>
            <p className="login-card__subtitle">
              {mode === 'login'
                ? 'Sign in to curate virtual 3D exhibitions, spatial lighting, and spatial audio salons.'
                : 'Register as an exhibition curator to compose and publish architectural art galleries.'}
            </p>
          </header>

          <div className="login-mode-switch" role="tablist" aria-label="Authentication selection">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`login-mode-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`login-mode-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="alert alert--error login-alert" role="alert">
              <span className="login-alert__dot" />
              <span className="login-alert__text">{error}</span>
            </div>
          )}

          <div className="oauth-providers">
            <a
              className="btn btn--google-auth"
              href="/api/auth/google"
              title="Authenticate via Google Workspace"
            >
              <Icon name="google" size={17} />
              <span>Continue with Google</span>
            </a>
          </div>

          <div className="login-divider">
            <span className="login-divider__line" />
            <span className="login-divider__label">or with credentials</span>
            <span className="login-divider__line" />
          </div>

          <form onSubmit={handlePasswordSubmit} className="login-form">
            {mode === 'register' && (
              <div className="login-field-group">
                <label htmlFor="full_name" className="login-label">
                  Curator Full Name
                </label>
                <div className="login-input-wrap">
                  <input
                    id="full_name"
                    type="text"
                    className="login-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Elena Rostova"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="login-field-group">
              <label htmlFor="email" className="login-label">
                Curator Email
              </label>
              <div className="login-input-wrap">
                <input
                  id="email"
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="curator@gallery.org"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={`login-field-group ${error ? 'error' : ''}`}>
              <label htmlFor="password" className="login-label">
                Password Key
              </label>
              <div className="login-input-wrap pwd-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="pwd-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {error && <span className="err">{error}</span>}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--login-action"
              disabled={loading}
            >
              {loading ? (
                <span>Authenticating…</span>
              ) : mode === 'login' ? (
                <>
                  <span>Sign In with Password</span>
                  <Icon name="chevronRight" size={15} />
                </>
              ) : (
                <>
                  <span>Create Curator Account</span>
                  <Icon name="plus" size={15} />
                </>
              )}
            </button>
          </form>

          <footer className="login-card__footer">
            <div className="login-security-seal">
              <Icon name="shield" size={13} />
              <span>Encrypted Session · Cloudflare D1 Architecture</span>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  user: CuratorUser;
  onEdit(id: string): void;
  onNew(): void;
  onLogout(): void;
  onAccount?(): void;
}

function Dashboard({ user, onEdit, onNew, onLogout, onAccount }: DashboardProps) {
  const [exhibitions, setExhibitions] = useState<ExhibitionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingExhibition, setSharingExhibition] = useState<ExhibitionDetail | null>(null);

  const fetchExhibitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/exhibitions', { credentials: 'include' });
      if (res.ok) {
        setExhibitions(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExhibitions();
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/exhibitions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setExhibitions((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="dash reda-parch">
      <div className="dhead">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/reda_logo.png"
            alt="Reda Gallery"
            style={{ width: '38px', height: '38px', objectFit: 'contain' }}
          />
          <div>
            <div className="k">REDA GALLERY · ARCHIVE &amp; STUDIO</div>
            <h1>Your exhibitions</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onAccount && (
            <button
              type="button"
              className="user-chip"
              onClick={onAccount}
              aria-label="Manage your account"
            >
              <span className="av" aria-hidden="true">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </span>
              <span className="user-chip__name">{user.full_name || user.email}</span>
            </button>
          )}
          <Button type="button" variant="primary" iconLeft="plus" onClick={onNew}>
            New exhibition
          </Button>
          <Button type="button" variant="ghost" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="studio-loading" style={{ minHeight: '300px' }}>Loading your exhibitions…</div>
      ) : exhibitions.length === 0 ? (
        <section className="empty" aria-label="No exhibitions yet">
          <div className="empty-ill" aria-hidden="true">
            <svg viewBox="0 0 220 140" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="30" y="24" width="160" height="92" rx="2" />
              <path d="M110 24v46h80" strokeDasharray="5 4" />
              <rect x="54" y="30" width="26" height="3.4" fill="currentColor" />
              <rect x="150" y="30" width="22" height="3.4" fill="currentColor" />
              <rect x="34" y="58" width="3.4" height="26" fill="currentColor" />
            </svg>
          </div>
          <h2 className="empty-h">You have no exhibitions yet</h2>
          <p className="empty-d">
            Start curating your first virtual exhibition — select artworks, craft an artistic narrative, and publish your 3D gallery.
          </p>
          <button className="empty-cta" type="button" onClick={onNew}>
            <Icon name="plus" size={16} /> Create your first exhibition
          </button>
        </section>
      ) : (
        <div className="dgrid">
          {exhibitions.map((ex) => (
            <div key={ex.id} className="dcard">
              <div className="prev">
                <div style={{ position: 'absolute', inset: 0, color: 'var(--reda-gold)', opacity: 0.35, padding: '22px' }}>
                  <svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }} fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="24" y="18" width="152" height="84" />
                    <path d="M100 18v40h76" strokeDasharray="4 3" />
                    <rect x="44" y="21" width="22" height="3" fill="currentColor" />
                    <rect x="120" y="21" width="26" height="3" fill="currentColor" />
                    <rect x="27" y="44" width="3" height="22" fill="currentColor" />
                  </svg>
                </div>
                <span className={`badge ${ex.is_published ? 'b-live' : 'b-draft'}`}>
                  {ex.is_published ? 'Live' : 'Draft'}
                </span>
                <span className="ct">
                  {ex.artworks?.length ?? 0} works · {ex.room?.name ?? 'No room'}
                </span>
              </div>
              <div className="bd">
                <h3>{ex.title}</h3>
                <div className="slug">/e/{ex.slug}</div>
                {ex.description && <p className="desc">{ex.description}</p>}
                <div className="cur">Curator · {ex.curator_name || '—'}</div>
                {formatDateRange(ex.start_date, ex.end_date) && (
                  <div className="dt">{formatDateRange(ex.start_date, ex.end_date)}</div>
                )}
              </div>
              <div className="acts">
                <button
                  type="button"
                  className="a-edit"
                  onClick={() => onEdit(ex.id)}
                >
                  Edit &amp; curate
                </button>
                <a
                  className="a-view"
                  href={`/e/${ex.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View 3D <Icon name="external" size={12} />
                </a>
                {!!ex.is_published && (
                  <button
                    type="button"
                    className="a-share"
                    onClick={() => setSharingExhibition(ex)}
                    title={`Share ${ex.title}`}
                  >
                    <Icon name="share" size={13} /> Share
                  </button>
                )}
                <button
                  type="button"
                  className={`a-del ${deletingId === ex.id ? 'armed' : ''}`}
                  aria-label={deletingId === ex.id ? 'Confirm delete' : `Delete ${ex.title}`}
                  onClick={() => {
                    if (deletingId === ex.id) {
                      handleDelete(ex.id);
                      setDeletingId(null);
                    } else {
                      setDeletingId(ex.id);
                    }
                  }}
                  onBlur={() => {
                    if (deletingId === ex.id) {
                      setTimeout(() => setDeletingId(null), 250);
                    }
                  }}
                >
                  {deletingId === ex.id ? (
                    'Confirm delete'
                  ) : (
                    <Icon name="trash" size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="dnew" onClick={onNew} aria-label="Create new exhibition">
            <div className="c">
              <Icon name="plus" size={20} />
            </div>
            New exhibition
          </button>
        </div>
      )}

      {sharingExhibition && (
        <ShareModal
          isOpen={!!sharingExhibition}
          onClose={() => setSharingExhibition(null)}
          exhibitionTitle={sharingExhibition.title}
          slug={sharingExhibition.slug}
        />
      )}
    </div>
  );
}

// ─── New Exhibition Form ───────────────────────────────────────────────────────

interface NewExhibitionFormProps {
  onCreated(id: string): void;
  onCancel(): void;
}

function NewExhibitionForm({ onCreated, onCancel }: NewExhibitionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [curatorName, setCuratorName] = useState('');
  const [roomSource, setRoomSource] = useState<'library' | 'custom_glb'>('library');
  const [roomId, setRoomId] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');
  const [customGlbInput, setCustomGlbInput] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/rooms', { credentials: 'include' })
      .then(async (r) => (await r.json()) as Room[])
      .then((data) => {
        setRooms(data);
        if (data.length > 0) setRoomId(data[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      let finalRoomId = roomId;

      if (roomSource === 'custom_glb') {
        const glbFileId = extractGoogleDriveFileId(customGlbInput.trim()) || customGlbInput.trim();
        if (!glbFileId) {
          setError('Please provide a Google Drive link, file ID, or 3D model URL for the custom room.');
          setCreating(false);
          return;
        }

        const roomRes = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: customRoomName.trim() || `${title.trim() || 'Custom'} Space`,
            glb_file_id: glbFileId,
            glb_source: customGlbInput.includes('drive.google.com') ? 'curator_drive' : 'platform_drive',
            is_public: 0,
          }),
        });

        if (!roomRes.ok) {
          setError(`Failed to create custom 3D space: ${await roomRes.text()}`);
          setCreating(false);
          return;
        }

        const newRoom = (await roomRes.json()) as Room;
        finalRoomId = newRoom.id;
      }

      // Generate a memorable and clean unique slug from the title
      const baseSlug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'exhibition';
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const generatedSlug = `${baseSlug}-${uniqueSuffix}`;

      const res = await fetch('/api/exhibitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          slug: generatedSlug,
          description: description.trim() || undefined,
          curator_name: curatorName.trim() || undefined,
          room_id: finalRoomId,
        }),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const created = (await res.json()) as { id: string };
      onCreated(created.id);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="studio-new-exhibition reda-parch">
      <header className="studio-header">
        <h1>Create New Exhibition</h1>
        <Button variant="ghost" onClick={onCancel} style={{ borderRadius: 'var(--reda-radius-pill)' }}>
          Cancel
        </Button>
      </header>

      <div style={{ padding: '20px clamp(16px, 4vw, 48px) 60px', maxWidth: '680px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="studio-card" role="dialog" aria-modal="true" aria-labelledby="new-ex-title">
          {error && (
            <p className="error" role="alert" style={{ marginBottom: '1rem' }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="studio-form">
            <TextField
              id="new-ex-title"
              label="Exhibition Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modernist Perspectives 2026"
              required
            />

            <TextField
              id="new-ex-curator"
              label="Curator Name"
              value={curatorName}
              onChange={(e) => setCuratorName(e.target.value)}
              placeholder="e.g. Elena Rostova"
            />

            {/* 3D Gallery Space Selector / Custom GLB */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="reda-field__label" style={{ display: 'block', marginBottom: '8px' }}>
                3D Gallery Space *
              </label>
              <div className="space-type-toggle" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className={`type-btn ${roomSource === 'library' ? 'active' : ''}`}
                  onClick={() => setRoomSource('library')}
                  style={{ justifyContent: 'center' }}
                >
                  <Icon name="cube" /> Platform Library Room
                </button>
                <button
                  type="button"
                  className={`type-btn ${roomSource === 'custom_glb' ? 'active' : ''}`}
                  onClick={() => setRoomSource('custom_glb')}
                  style={{ justifyContent: 'center' }}
                >
                  <Icon name="map" /> Custom 3D Space (.GLB)
                </button>
              </div>

              {roomSource === 'library' ? (
                <SelectField
                  id="new-ex-room"
                  label="Select Gallery Room"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_public ? '(Platform Library)' : '(Custom Room)'}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <div
                  className="nested-space-block"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '18px',
                    background: 'var(--reda-parch)',
                    borderRadius: '12px',
                    border: '1px solid var(--reda-parch-border)',
                    boxSizing: 'border-box',
                    width: '100%',
                    marginTop: '14px',
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="custom-room-name" className="reda-field__label">
                      Custom Space Name
                    </label>
                    <input
                      id="custom-room-name"
                      type="text"
                      value={customRoomName}
                      onChange={(e) => setCustomRoomName(e.target.value)}
                      placeholder="e.g. Modern Minimalist Pavilion"
                      className="reda-field__control"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="custom-glb-file" className="reda-field__label">
                      Google Drive Link or File ID (.GLB Model) *
                    </label>
                    <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box', alignItems: 'center' }}>
                      <input
                        id="custom-glb-file"
                        type="text"
                        value={customGlbInput}
                        onChange={(e) => setCustomGlbInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... or File ID"
                        className="reda-field__control"
                        required={roomSource === 'custom_glb'}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: 'var(--reda-mono)',
                          fontSize: '12.5px',
                        }}
                      />
                      <DriveFilePicker
                        mimeTypes="model/gltf-binary"
                        onPicked={(fileId: string) => {
                          setCustomGlbInput(fileId);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <TextArea
              id="new-ex-desc"
              label="Curatorial Statement / Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Exhibition overview..."
            />

            <div className="form-actions" style={{ marginTop: '26px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={onCancel} style={{ borderRadius: 'var(--reda-radius-pill)' }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={creating}
                style={{
                  borderRadius: 'var(--reda-radius-pill)',
                  background: 'var(--reda-son)',
                  borderColor: 'var(--reda-son-hi)',
                  color: 'var(--reda-cream-hi)',
                  fontWeight: 600,
                }}
              >
                {creating ? 'Creating…' : 'Create & Start Curating'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
