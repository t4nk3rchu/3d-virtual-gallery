import { useState, useEffect, type FormEvent } from 'react';
import type { Artist, Artwork } from '../../../types/schema';
import { extractGoogleDriveFileId, getImageUrl } from '../../../lib/media/gdrive';
import { isArtworkPlaced } from '../../../lib/studio/artwork-placement';
import { DriveFilePicker } from '../DriveFilePicker';
import { Icon, Button, TextField, TextArea } from '../../ui';
import { useToast } from '../../../context/ToastContext';

interface ArtistInspectorProps {
  width?: number;
  exhibitionId: string;
  selectedId: string | null;
  artists: Artist[];
  artworks: Artwork[];
  isTeam?: boolean;
  onResizeStart?(e: React.MouseEvent): void;
  onSaved(): void;
  onDeselect(): void;
  onSelectArtwork?(artworkId: string): void;
}

export function ArtistInspector({
  width,
  exhibitionId,
  selectedId,
  artists,
  artworks,
  isTeam = false,
  onResizeStart,
  onSaved,
  onDeselect,
  onSelectArtwork,
}: ArtistInspectorProps) {
  const toast = useToast();
  const isNew = selectedId === 'new';
  const existingArtist = isNew ? null : artists.find((a) => a.id === selectedId) ?? null;

  const [name, setName] = useState('');
  const [lifeDates, setLifeDates] = useState('');
  const [quote, setQuote] = useState('');
  const [bio, setBio] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [portraitInput, setPortraitInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingArtist) {
      setName(existingArtist.name || '');
      setLifeDates(existingArtist.life_dates || '');
      setQuote(existingArtist.quote || '');
      setBio(existingArtist.biography || '');
      setContactInfo(existingArtist.contact_info || '');
      setPortraitInput(existingArtist.portrait_file_id || '');
    } else {
      setName('');
      setLifeDates('');
      setQuote('');
      setBio('');
      setContactInfo('');
      setPortraitInput('');
    }
  }, [existingArtist, selectedId]);

  if (!selectedId) {
    return null;
  }

  const parsedPortraitId = extractGoogleDriveFileId(portraitInput) || portraitInput.trim();
  const portraitUrl = parsedPortraitId ? getImageUrl(parsedPortraitId, 'thumbnail') : null;

  const assignedWorks = existingArtist
    ? artworks.filter(
        (a) => a.artist_id === existingArtist.id || a.artist === existingArtist.name
      )
    : [];

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Tên họa sĩ không được để trống.');
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      biography: bio.trim() || undefined,
      life_dates: lifeDates.trim() || undefined,
      quote: quote.trim() || undefined,
      contact_info: contactInfo.trim() || undefined,
      portrait_file_id: parsedPortraitId || undefined,
    };

    try {
      if (isNew) {
        const res = await fetch(`/api/exhibitions/${exhibitionId}/artists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          toast.error(`Lỗi tạo hồ sơ: ${await res.text()}`);
          return;
        }
        toast.success(`Đã thêm hồ sơ họa sĩ "${name.trim()}".`);
      } else if (existingArtist) {
        const res = await fetch(`/api/artists/${existingArtist.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          toast.error(`Lỗi cập nhật hồ sơ: ${await res.text()}`);
          return;
        }
        toast.success(`Đã lưu thay đổi hồ sơ họa sĩ "${name.trim()}".`);
      }
      onSaved();
    } catch {
      toast.error('Lỗi kết nối khi lưu hồ sơ họa sĩ.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingArtist) return;
    if (!confirm(`Are you sure you want to delete profile for "${existingArtist.name}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/artists/${existingArtist.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        toast.error(`Lỗi xóa họa sĩ: ${await res.text()}`);
        return;
      }
      toast.info(`Đã xóa hồ sơ họa sĩ "${existingArtist.name}".`);
      onDeselect();
      onSaved();
    } catch {
      toast.error('Lỗi kết nối khi xóa hồ sơ họa sĩ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="wb-insp"
      style={{
        width: width ? `${width}px` : undefined,
        position: 'relative',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {onResizeStart && (
        <div
          className="wb-resizer"
          onMouseDown={onResizeStart}
          title="Drag to resize inspector width"
        />
      )}
      <div className="ih" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>{isNew ? 'New Artist Profile' : existingArtist?.name}</h3>
          <div className="ih-sub">
            {isNew
              ? 'Add artist bio and attribution details'
              : existingArtist?.life_dates || 'Artist Portfolio & Bio'}
          </div>
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
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: 'var(--reda-radius)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="body">
        <form onSubmit={handleSave} className="artwork-form">
          {/* Portrait Picker & Preview */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
            <div className="portrait">
              {portraitUrl ? (
                <img
                  src={portraitUrl}
                  alt={name || 'Portrait'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Icon name="users" size={20} />
              )}
            </div>
            <div>
              <DriveFilePicker
                mimeTypes="image/png,image/jpeg,image/webp,image/gif"
                isTeam={isTeam}
                buttonLabel="Pick portrait"
                onPicked={(id) => setPortraitInput(id)}
              />
            </div>
          </div>

          <TextField
            id="art-prof-name"
            label="Artist Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Trần Văn Cẩn"
            required
          />

          <TextField
            id="art-prof-dates"
            label="Life Dates / Active Years"
            value={lifeDates}
            onChange={(e) => setLifeDates(e.target.value)}
            placeholder="e.g. 1910–1994"
          />

          <TextField
            id="art-prof-quote"
            label="Artist Quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="e.g. Art is the essence of life..."
          />

          <TextArea
            id="art-prof-bio"
            label="Biography"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Curatorial biography..."
          />

          <TextField
            id="art-prof-contact"
            label="Contact / Web / Socials"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="e.g. Hanoi | website.com | @handle"
          />

          {existingArtist && (
            <div style={{ margin: '16px 0 8px', paddingTop: '12px', borderTop: '1px solid var(--reda-parch-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--reda-ink-2)' }}>
                  Assigned Works ({assignedWorks.length})
                </span>
                {assignedWorks.length > 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--reda-muted-2)', fontFamily: 'var(--reda-ui)' }}>
                    Click to edit in Curate mode
                  </span>
                )}
              </div>

              {assignedWorks.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--reda-muted-2)', fontStyle: 'italic' }}>
                  No artworks linked to this artist yet. Link artworks in Curate mode.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {assignedWorks.map((work) => {
                    const isPlaced = isArtworkPlaced(work);
                    return (
                      <button
                        key={work.id}
                        type="button"
                        onClick={() => onSelectArtwork?.(work.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '7px 10px',
                          background: 'rgba(0, 0, 0, 0.03)',
                          border: '1px solid var(--reda-parch-border)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.07)';
                          e.currentTarget.style.borderColor = 'var(--reda-oxblood)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                          e.currentTarget.style.borderColor = 'var(--reda-parch-border)';
                        }}
                        title={`Edit "${work.title}" in Curate mode`}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '28px',
                            borderRadius: '3px',
                            backgroundColor: 'var(--reda-char-3)',
                            backgroundImage: work.media_file_id
                              ? `url(${getImageUrl(work.media_file_id, 'thumbnail')})`
                              : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid rgba(0, 0, 0, 0.15)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--reda-display)',
                              fontWeight: 600,
                              fontSize: '13px',
                              color: 'var(--reda-ink)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {work.title}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--reda-ink-2)' }}>
                            {work.medium || work.artwork_type} · {isPlaced ? 'In Room' : 'Storage'}
                          </div>
                        </div>
                        <span style={{ color: 'var(--reda-oxblood)', display: 'inline-flex', flexShrink: 0 }}>
                          <Icon name="arrowRight" size={12} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            {existingArtist ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={saving}
                style={{ borderRadius: 'var(--reda-radius-pill)' }}
              >
                Delete
              </Button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={onDeselect}
                disabled={saving}
                style={{ borderRadius: 'var(--reda-radius-pill)' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                style={{ borderRadius: 'var(--reda-radius-pill)' }}
              >
                {saving ? 'Saving…' : isNew ? 'Add Artist' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
