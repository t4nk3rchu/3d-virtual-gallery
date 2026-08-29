import { useState, type FormEvent } from 'react';
import type { Artist, ArtistInput } from '../../types/schema';
import { extractGoogleDriveFileId, getImageUrl } from '../../lib/media/gdrive';
import { DriveFilePicker } from './DriveFilePicker';

interface ArtistManagerModalProps {
  exhibitionId: string;
  artists: Artist[];
  isTeam?: boolean;
  onArtistsChanged(): void;
  onClose(): void;
}

export function ArtistManagerModal({
  exhibitionId,
  artists,
  isTeam = false,
  onArtistsChanged,
  onClose,
}: ArtistManagerModalProps) {
  const [editingArtist, setEditingArtist] = useState<Artist | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [lifeDates, setLifeDates] = useState('');
  const [quote, setQuote] = useState('');
  const [biography, setBiography] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [portraitInput, setPortraitInput] = useState('');

  const startEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setName(artist.name);
    setLifeDates(artist.life_dates ?? '');
    setQuote(artist.quote ?? '');
    setBiography(artist.biography ?? '');
    setContactInfo(artist.contact_info ?? '');
    setPortraitInput(artist.portrait_file_id ?? '');
    setError(null);
  };

  const startNew = () => {
    setEditingArtist('new');
    setName('');
    setLifeDates('');
    setQuote('');
    setBiography('');
    setContactInfo('');
    setPortraitInput('');
    setError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Artist name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const parsedPortraitId = portraitInput.trim()
      ? extractGoogleDriveFileId(portraitInput.trim()) || portraitInput.trim()
      : null;

    const payload: ArtistInput = {
      exhibition_id: exhibitionId,
      name: name.trim(),
      life_dates: lifeDates.trim() || null,
      quote: quote.trim() || null,
      biography: biography.trim() || null,
      contact_info: contactInfo.trim() || null,
      portrait_file_id: parsedPortraitId,
      order_index: editingArtist && editingArtist !== 'new' ? editingArtist.order_index : artists.length,
    };

    try {
      if (editingArtist === 'new') {
        const res = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else if (editingArtist) {
        const res = await fetch(`/api/artists/${editingArtist.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }

      onArtistsChanged();
      setEditingArtist(null);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save artist.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (artist: Artist) => {
    if (!window.confirm(`Delete profile for "${artist.name}"?`)) return;
    try {
      const res = await fetch(`/api/artists/${artist.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onArtistsChanged();
      } else {
        alert('Failed to delete artist.');
      }
    } catch {
      alert('Network error while deleting artist.');
    }
  };

  const parsedPortraitId = portraitInput.trim()
    ? extractGoogleDriveFileId(portraitInput.trim()) || portraitInput.trim()
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            👥 Exhibition Artists ({artists.length})
          </h3>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {editingArtist ? (
          <form onSubmit={handleSave} className="studio-form">
            <h4 style={{ margin: '0 0 1rem', color: '#c9d1d9' }}>
              {editingArtist === 'new' ? 'Add New Artist' : `Edit "${editingArtist.name}"`}
            </h4>

            {error && (
              <p className="error" role="alert" style={{ marginBottom: '1rem' }}>
                {error}
              </p>
            )}

            <div className="form-group">
              <label className="form-label">Artist Name *</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trần Văn Cẩn"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Life Dates / Active Years</label>
              <input
                className="input"
                value={lifeDates}
                onChange={(e) => setLifeDates(e.target.value)}
                placeholder="e.g. 1910 - 1994 (or Active 1930s-1980s)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Artist Quote</label>
              <input
                className="input"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="e.g. Art is the essence of life..."
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Portrait Image (Google Drive Link or URL)
                </label>
                <DriveFilePicker
                  mimeTypes="image/png,image/jpeg,image/webp,image/gif"
                  isTeam={isTeam}
                  buttonLabel="📁 Pick Portrait from Google Drive"
                  onPicked={(fileId) => setPortraitInput(fileId)}
                  onRejected={(name) =>
                    setError(`"${name}" isn't shared with "Anyone with the link" — please update sharing settings in Google Drive and try again.`)
                  }
                />
              </div>
              <input
                className="input"
                value={portraitInput}
                onChange={(e) => setPortraitInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or direct image URL"
              />
              {parsedPortraitId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <img
                    src={getImageUrl(parsedPortraitId)}
                    alt="Preview"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #444' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="hint" style={{ fontSize: '0.8rem' }}>
                    Preview loaded (ID: {parsedPortraitId.slice(0, 16)}…)
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Biography</label>
              <textarea
                className="input textarea"
                rows={5}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Enter detailed artist biography, career highlights, exhibitions, artistic style..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact / Web / Socials</label>
              <input
                className="input"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. Hanoi, Vietnam | portfolio.com | @artist"
              />
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Artist'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setEditingArtist(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button type="button" className="btn btn--primary" onClick={startNew}>
                + Add Artist
              </button>
            </div>

            {artists.length === 0 ? (
              <p className="hint" style={{ textAlign: 'center', padding: '2rem 0' }}>
                No artist profiles added yet. Click &quot;+ Add Artist&quot; to create one.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {artists.map((artist) => (
                  <div
                    key={artist.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {artist.portrait_file_id ? (
                        <img
                          src={getImageUrl(artist.portrait_file_id)}
                          alt={artist.name}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: '#2b313a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                          }}
                        >
                          👤
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#f0f6fc' }}>{artist.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                          {artist.life_dates || 'No dates specified'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => startEdit(artist)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => handleDelete(artist)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
