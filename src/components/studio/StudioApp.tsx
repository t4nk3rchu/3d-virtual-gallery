import { useState, useEffect, type FormEvent } from 'react';
import type {
  ExhibitionDetail,
  Room,
} from '../../types/schema';
import { Workbench } from './workbench/Workbench';
import { Icon, Button, TextField, TextArea, SelectField } from '../ui';
import { DriveFilePicker } from './DriveFilePicker';
import { extractGoogleDriveFileId } from '../../lib/media/gdrive';

type CmsView =
  | { type: 'login' }
  | { type: 'dashboard' }
  | { type: 'editor'; exhibitionId: string }
  | { type: 'new-exhibition' };

interface CuratorUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_team?: boolean;
}

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

  if (checking) return <div className="studio-loading reda-dark">Loading Curator Studio…</div>;

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (me.ok) onLoggedIn((await me.json()) as CuratorUser);
    } catch {
      setError('Network error during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page reda-dark" aria-labelledby="login-heading">
      <div className="login-card">
        <header className="login-card__header">
          <img
            src="/reda_logo.png"
            alt="Reda Gallery"
            style={{
              width: '48px',
              height: '48px',
              objectFit: 'contain',
              margin: '0 auto 12px',
              display: 'block',
            }}
          />
          <span className="app-badge">Reda Gallery · Curator Studio</span>
          <h1 id="login-heading" className="login-card__title">
            {mode === 'login' ? 'Sign in to curate' : 'Create curator account'}
          </h1>
          <p className="login-card__subtitle">
            Curate virtual 3D exhibitions with high-resolution imagery and spatial audio.
          </p>
        </header>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="oauth-providers">
          <a
            className="btn btn--secondary btn--full btn--google"
            href="/api/auth/google"
          >
            <Icon name="google" /> Continue with Google
          </a>
        </div>

        <div className="divider">
          <span>or with email</span>
        </div>

        <form onSubmit={handlePasswordSubmit} className="login-form">
          {mode === 'register' && (
            <TextField
              id="full_name"
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Elena Rostova"
              required
            />
          )}

          <TextField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="curator@gallery.org"
            required
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="btn--full"
            disabled={loading}
          >
            {loading
              ? 'Please wait…'
              : mode === 'login'
              ? 'Sign in with Password'
              : 'Create Account'}
          </Button>

          <div className="login-toggle">
            {mode === 'login' ? (
              <Button
                type="button"
                variant="ghost"
                className="btn--sm"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
              >
                Need an account? Register
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="btn--sm"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Already have an account? Sign in
              </Button>
            )}
          </div>
        </form>
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
}

function Dashboard({ user, onEdit, onNew, onLogout }: DashboardProps) {
  const [exhibitions, setExhibitions] = useState<ExhibitionDetail[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const res = await fetch(`/api/exhibitions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setExhibitions((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="dash reda-dark">
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
            <div className="who">Signed in as {user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
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
                <span className="badge">{ex.is_published ? 'Live' : 'Draft'}</span>
                <span className="ct">
                  {ex.artworks?.length ?? 0} works · {ex.room?.name ?? 'No room'}
                </span>
              </div>
              <div className="bd">
                <h3>{ex.title}</h3>
                <div className="slug">/e/{ex.slug}</div>
                <div className="cur">Curator · {ex.curator_name || '—'}</div>
              </div>
              <div className="acts">
                <Button variant="primary" size="sm" onClick={() => onEdit(ex.id)}>
                  Edit &amp; curate
                </Button>
                <a
                  className="btn btn--secondary btn--sm"
                  href={`/e/${ex.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View 3D <Icon name="external" size={12} />
                </a>
                <Button
                  variant="danger"
                  size="sm"
                  iconLeft="trash"
                  aria-label={`Delete ${ex.title}`}
                  onClick={() => handleDelete(ex.id, ex.title)}
                />
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
    <div className="studio-new-exhibition reda-dark">
      <header className="studio-header">
        <h1>Create New Exhibition</h1>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </header>

      <div style={{ padding: '32px clamp(16px, 4vw, 48px) 64px', maxWidth: '720px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="studio-card">
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
              <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                3D Gallery Space *
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className={`type-btn ${roomSource === 'library' ? 'active' : ''}`}
                  onClick={() => setRoomSource('library')}
                  style={{ flex: 1 }}
                >
                  <Icon name="cube" /> Platform Library Room
                </button>
                <button
                  type="button"
                  className={`type-btn ${roomSource === 'custom_glb' ? 'active' : ''}`}
                  onClick={() => setRoomSource('custom_glb')}
                  style={{ flex: 1 }}
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
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '16px',
                    background: 'var(--reda-parch)',
                    borderRadius: '6px',
                    border: '1px solid var(--reda-parch-border)',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="custom-room-name" className="form-label" style={{ color: 'var(--reda-ink-2)' }}>
                      Custom Space Name
                    </label>
                    <input
                      id="custom-room-name"
                      type="text"
                      value={customRoomName}
                      onChange={(e) => setCustomRoomName(e.target.value)}
                      placeholder="e.g. Modern Minimalist Pavilion"
                      className="input"
                      style={{
                        background: 'var(--reda-parch-card)',
                        color: 'var(--reda-ink)',
                        borderColor: 'var(--reda-parch-border)',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="custom-glb-file" className="form-label" style={{ color: 'var(--reda-ink-2)' }}>
                      Google Drive Link or File ID (.GLB Model) *
                    </label>
                    <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box', alignItems: 'center' }}>
                      <input
                        id="custom-glb-file"
                        type="text"
                        value={customGlbInput}
                        onChange={(e) => setCustomGlbInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... or File ID"
                        className="input"
                        required={roomSource === 'custom_glb'}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'var(--reda-parch-card)',
                          color: 'var(--reda-ink)',
                          borderColor: 'var(--reda-parch-border)',
                          boxSizing: 'border-box',
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

            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create & Start Curating'}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
