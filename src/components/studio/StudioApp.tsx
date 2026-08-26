/**
 * Task 11: Curator CMS — main Studio shell
 * Login, Dashboard, ExhibitionEditor, ArtworkManager, RoomImporter, 3D Gizmo Placement, and Hotspot Editor
 */
import { useState, useEffect, type FormEvent } from 'react';
import type {
  Exhibition,
  ExhibitionDetail,
  Artwork,
  Room,
} from '../../types/schema';
import { getImageUrl } from '../../lib/media/gdrive';
import { RoomImporter } from './RoomImporter';
import { ArtworkForm } from './ArtworkForm';
import { HotspotEditor } from './HotspotEditor';
import { GizmoPlacement } from './GizmoPlacement';

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

  if (checking) return <div className="studio-loading">Loading Curator Studio…</div>;

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
      <ExhibitionEditor
        exhibitionId={view.exhibitionId}
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
    <main className="login-page" aria-label="Sign in">
      <div className="login-card">
        <h1 className="login-card__title">3D Virtual Gallery</h1>
        <p className="login-card__subtitle">Curator Studio</p>

        <a
          className="btn btn--google"
          href="/api/auth/google"
          aria-label="Sign in with Google"
        >
          <span aria-hidden="true">G</span> Continue with Google
        </a>

        <hr className="login-divider" aria-hidden="true" />
        <p className="login-divider__label">
          {mode === 'login' ? 'or sign in with password' : 'or create a local curator account'}
        </p>

        <form onSubmit={handlePasswordSubmit} noValidate>
          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="login-name" className="sr-only">
                Full Name
              </label>
              <input
                id="login-name"
                type="text"
                placeholder="Full Name (e.g. Curator Alex)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input"
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label htmlFor="login-email" className="sr-only">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              className="input"
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={loading}>
            {loading
              ? mode === 'register'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'register'
              ? 'Create Curator Account'
              : 'Sign in'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            {mode === 'login' ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
              >
                Need an account? Register here
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Already have an account? Sign in
              </button>
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
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/exhibitions', { credentials: 'include' })
      .then(async (r) => (await r.json()) as Exhibition[])
      .then(setExhibitions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the exhibition "${title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/exhibitions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setExhibitions((prev) => prev.filter((ex) => ex.id !== id));
      } else {
        alert('Failed to delete exhibition.');
      }
    } catch {
      alert('Network error while deleting exhibition.');
    }
  };

  return (
    <div className="studio-dashboard">
      <header className="studio-header">
        <div>
          <h1 className="studio-header__title">My Virtual Exhibitions</h1>
          <p className="studio-header__curator">Logged in as {user.email}</p>
        </div>
        <div className="studio-header__actions">
          <button className="btn btn--primary" onClick={onNew}>
            + New Exhibition
          </button>
          <button className="btn btn--ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      {loading ? (
        <p className="studio-loading">Loading exhibitions…</p>
      ) : exhibitions.length === 0 ? (
        <div className="studio-empty">
          <p>You have not created any exhibitions yet.</p>
          <button className="btn btn--primary" onClick={onNew}>
            Create your first exhibition
          </button>
        </div>
      ) : (
        <ul className="exhibition-list">
          {exhibitions.map((ex) => (
            <li key={ex.id} className="exhibition-list__item">
              <div className="exhibition-list__info">
                <h3>{ex.title}</h3>
                <p className="slug-preview">/e/{ex.slug}</p>
                <span
                  className={`badge ${
                    ex.is_published ? 'badge--live' : 'badge--draft'
                  }`}
                >
                  {ex.is_published ? 'Published (Live)' : 'Draft'}
                </span>
              </div>
              <div className="exhibition-list__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => onEdit(ex.id)}
                >
                  Edit &amp; Curate
                </button>
                <a
                  className="btn btn--ghost"
                  href={`/e/${ex.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View 3D ↗
                </a>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(ex.id, ex.title)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
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
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [curatorName, setCuratorName] = useState('');
  const [roomId, setRoomId] = useState('');
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

    if (!roomId) {
      setError('Please select or import a room.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/exhibitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
          room_id: roomId,
          description: description.trim() || null,
          curator_name: curatorName.trim() || null,
        }),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const ex = (await res.json()) as { id: string };
      onCreated(ex.id);
    } catch {
      setError('Network error while creating exhibition.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="studio-new-exhibition">
      <h2>Create New Exhibition</h2>
      <form onSubmit={handleSubmit} className="new-exhibition-form">
        <div className="form-group">
          <label htmlFor="new-ex-title" className="form-label">
            Exhibition Title
          </label>
          <input
            id="new-ex-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Modernist Horizons 2026"
            required
            className="input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-ex-slug" className="form-label">
            Public URL Slug (e.g. /e/modernist-horizons)
          </label>
          <input
            id="new-ex-slug"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
            }
            placeholder="modernist-horizons"
            required
            pattern="[a-z0-9-]+"
            className="input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-ex-curator" className="form-label">
            Curator Name (Optional)
          </label>
          <input
            id="new-ex-curator"
            value={curatorName}
            onChange={(e) => setCuratorName(e.target.value)}
            placeholder="e.g. Elena Rostova"
            className="input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-ex-desc" className="form-label">
            Exhibition Statement / Description
          </label>
          <textarea
            id="new-ex-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Overview of the exhibition concept and themes..."
            className="input textarea"
          />
        </div>

        {/* Room Importer Component */}
        <RoomImporter
          rooms={rooms}
          selectedRoomId={roomId}
          onSelectRoom={setRoomId}
          onRoomCreated={(r) => setRooms((prev) => [r, ...prev])}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={creating || !roomId}
          >
            {creating ? 'Creating…' : 'Create Exhibition'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Exhibition Editor ────────────────────────────────────────────────────────

interface ExhibitionEditorProps {
  exhibitionId: string;
  onBack(): void;
}

function ExhibitionEditor({ exhibitionId, onBack }: ExhibitionEditorProps) {
  const [exhibition, setExhibition] = useState<ExhibitionDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const fetchExhibition = () => {
    fetch(`/api/exhibitions/${exhibitionId}`, { credentials: 'include' })
      .then(async (r) => (await r.json()) as ExhibitionDetail)
      .then(setExhibition)
      .catch(() => {});
  };

  useEffect(() => {
    fetchExhibition();
  }, [exhibitionId]);

  const handlePublish = async () => {
    if (!exhibition) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: 1 }),
      });
      if (res.ok) {
        setExhibition({ ...exhibition, is_published: 1 });
        setStatus('✓ Published! Edge CDN cache pre-warmed for 3D room and media.');
      } else {
        setStatus('Publish failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!exhibition) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: 0 }),
      });
      if (res.ok) {
        setExhibition({ ...exhibition, is_published: 0 });
        setStatus('Exhibition reverted to draft.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExhibition = async () => {
    if (!exhibition) return;
    if (!window.confirm(`Are you sure you want to delete "${exhibition.title}"? This will delete the exhibition, its artworks, and 3D configuration.`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/exhibitions/${exhibitionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onBack();
      } else {
        alert('Failed to delete exhibition.');
      }
    } catch {
      alert('Network error while deleting exhibition.');
    } finally {
      setSaving(false);
    }
  };

  if (!exhibition) return <div className="studio-loading">Loading exhibition editor…</div>;

  return (
    <div className="studio-editor">
      <header className="studio-editor__header">
        <button className="btn btn--ghost" onClick={onBack}>
          ← Dashboard
        </button>
        <div className="title-area">
          <h2 className="studio-editor__title">{exhibition.title}</h2>
          <span
            className={`badge ${
              exhibition.is_published ? 'badge--live' : 'badge--draft'
            }`}
          >
            {exhibition.is_published ? 'Published' : 'Draft'}
          </span>
        </div>

        <div className="header-actions">
          {exhibition.is_published ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleUnpublish}
              disabled={saving}
            >
              Unpublish to Draft
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handlePublish}
              disabled={saving}
            >
              {saving ? 'Publishing…' : 'Publish Exhibition'}
            </button>
          )}

          <a
            className="btn btn--secondary"
            href={`/e/${exhibition.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview 3D Room ↗
          </a>

          <button
            type="button"
            className="btn btn--danger"
            onClick={handleDeleteExhibition}
            disabled={saving}
          >
            Delete Exhibition
          </button>
        </div>
      </header>

      {status && (
        <div className="studio-editor__status-banner" role="status">
          {status}
        </div>
      )}

      {/* Artworks Management Section */}
      <ArtworkManager
        exhibition={exhibition}
        onArtworksChanged={fetchExhibition}
      />
    </div>
  );
}

// ─── Artwork Manager ─────────────────────────────────────────────────────────

interface ArtworkManagerProps {
  exhibition: ExhibitionDetail;
  onArtworksChanged(): void;
}

function ArtworkManager({ exhibition, onArtworksChanged }: ArtworkManagerProps) {
  const [formArtwork, setFormArtwork] = useState<Artwork | null | 'new'>(null);
  const [hotspotArtwork, setHotspotArtwork] = useState<Artwork | null>(null);
  const [gizmoActive, setGizmoActive] = useState(false);
  const [selectedGizmoArtId, setSelectedGizmoArtId] = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const artworks = exhibition.artworks || [];

  const handleDelete = async (artworkId: string) => {
    if (!confirm('Are you sure you want to delete this artwork?')) return;
    setDeletingId(artworkId);
    try {
      const res = await fetch(`/api/artworks/${artworkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onArtworksChanged();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="artwork-manager">
      <div className="artwork-manager__header">
        <div>
          <h3>Exhibition Artworks ({artworks.length})</h3>
          <p className="artwork-manager__hint">
            Manage your paintings, videos, and audio installations. Use 3D Gizmo Placement to hang
            them on the walls of {exhibition.room.name}.
          </p>
        </div>
        <div className="artwork-manager__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setFormArtwork('new')}
          >
            + Add Artwork
          </button>
          {artworks.length > 0 && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setSelectedGizmoArtId(artworks[0]?.id);
                setGizmoActive(true);
              }}
            >
              🎮 3D Gizmo Scene Placement
            </button>
          )}
        </div>
      </div>

      {artworks.length === 0 ? (
        <div className="artwork-manager__empty">
          <p>No artworks in this exhibition yet.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setFormArtwork('new')}
          >
            Add First Artwork
          </button>
        </div>
      ) : (
        <div className="artwork-cards-grid">
          {artworks.map((art, index) => {
            let thumbUrl: string | null = null;
            if (art.artwork_type === 'IMAGE_2D' && art.media_file_id) {
              thumbUrl = getImageUrl(art.media_file_id, 'thumbnail');
            } else if (art.artwork_type === 'VIDEO' && art.youtube_video_id) {
              thumbUrl = `https://img.youtube.com/vi/${art.youtube_video_id}/hqdefault.jpg`;
            }

            return (
              <div key={art.id} className="artwork-card">
                <div className="artwork-card__media">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={art.title}
                      className="artwork-card__thumb"
                    />
                  ) : art.artwork_type === 'AUDIO' ? (
                    <div className="artwork-card__audio-placeholder">
                      🎵 Audio Marker
                    </div>
                  ) : (
                    <div className="artwork-card__placeholder">No Media</div>
                  )}
                  <span className="artwork-type-badge">{art.artwork_type}</span>
                </div>

                <div className="artwork-card__body">
                  <h4 className="artwork-card__title">
                    {index + 1}. {art.title}
                  </h4>
                  {art.artist && (
                    <p className="artwork-card__artist">{art.artist}</p>
                  )}
                  {art.medium && (
                    <p className="artwork-card__meta">{art.medium}</p>
                  )}
                  {art.dimensions && (
                    <p className="artwork-card__dims">{art.dimensions}</p>
                  )}

                  {art.artwork_type === 'IMAGE_2D' && (
                    <p className="artwork-card__hotspots-count">
                      Pins: {art.hotspots?.length || 0} hotspots
                    </p>
                  )}
                </div>

                <div className="artwork-card__footer">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setFormArtwork(art)}
                  >
                    Edit Info
                  </button>

                  <button
                    type="button"
                    className="btn btn--sm btn--secondary"
                    onClick={() => {
                      setSelectedGizmoArtId(art.id);
                      setGizmoActive(true);
                    }}
                    title="Position artwork in 3D scene"
                  >
                    Move in 3D
                  </button>

                  {art.artwork_type === 'IMAGE_2D' && (
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => setHotspotArtwork(art)}
                    >
                      Hotspots ({art.hotspots?.length || 0})
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => handleDelete(art.id)}
                    disabled={deletingId === art.id}
                  >
                    {deletingId === art.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Artwork Form Modal */}
      {formArtwork && (
        <ArtworkForm
          exhibitionId={exhibition.id}
          artwork={formArtwork === 'new' ? null : formArtwork}
          onSaved={() => {
            setFormArtwork(null);
            onArtworksChanged();
          }}
          onCancel={() => setFormArtwork(null)}
        />
      )}

      {/* Hotspot Editor Modal */}
      {hotspotArtwork && (
        <HotspotEditor
          artwork={hotspotArtwork}
          hotspots={
            exhibition.artworks.find((a) => a.id === hotspotArtwork.id)
              ?.hotspots || []
          }
          onHotspotsUpdated={() => {
            onArtworksChanged();
          }}
          onClose={() => setHotspotArtwork(null)}
        />
      )}

      {/* 3D Gizmo Placement View */}
      {gizmoActive && (
        <GizmoPlacement
          room={exhibition.room}
          artworks={artworks}
          initialSelectedArtworkId={selectedGizmoArtId}
          onArtworkTransformSaved={() => {
            onArtworksChanged();
          }}
          onClose={() => setGizmoActive(false)}
        />
      )}
    </section>
  );
}
