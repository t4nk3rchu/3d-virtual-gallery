import { useState, type FormEvent } from 'react';
import type { ExhibitionDetail, Room } from '../../../types/schema';
import { INTRO_TRANSITIONS, type IntroTransition } from '../../../lib/viewer/intro-animations';
import { extractGoogleDriveFileId } from '../../../lib/media/gdrive';
import {
  parseSpawnPoint,
  serializeSpawnPoint,
  formatSpawnCoordinates,
} from '../../../lib/studio/spawn-point';
import { DriveFilePicker } from '../DriveFilePicker';
import { TextField, TextArea, SelectField, SegmentedControl, Button, Icon } from '../../ui';

interface SetupSheetProps {
  exhibition: ExhibitionDetail;
  rooms: Room[];
  isTeam?: boolean;
  onSaved(): void;
  onManageArtists?(): void;
}

export function SetupSheet({
  exhibition,
  rooms,
  isTeam = false,
  onSaved,
  onManageArtists,
}: SetupSheetProps) {
  let initialIntroTransition: IntroTransition = 'zoom_in';
  try {
    if (exhibition.settings_json) {
      const parsed = JSON.parse(exhibition.settings_json);
      if (parsed.introTransition) initialIntroTransition = parsed.introTransition;
    }
  } catch {}

  const currentSpawn = parseSpawnPoint(exhibition.settings_json, exhibition.room?.spawn_json);
  const hasCustomSpawn = Boolean(
    exhibition.settings_json && JSON.parse(exhibition.settings_json)?.spawnPoint
  );

  const [title, setTitle] = useState(exhibition.title);
  const [curatorName, setCuratorName] = useState(exhibition.curator_name ?? '');
  const [roomId, setRoomId] = useState(exhibition.room_id || exhibition.room?.id || '');
  const [curationType, setCurationType] = useState<'solo' | 'group'>(
    exhibition.curation_type || 'solo',
  );
  const [introVideoFileId, setIntroVideoFileId] = useState(
    exhibition.intro_video_file_id ?? '',
  );
  const [introTransition, setIntroTransition] = useState<IntroTransition>(
    initialIntroTransition,
  );
  const [description, setDescription] = useState(exhibition.description ?? '');

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/exhibitions/${exhibition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          curator_name: curatorName.trim() || undefined,
          room_id: roomId,
          curation_type: curationType,
          intro_video_file_id: introVideoFileId.trim() || undefined,
          intro_transition: introTransition,
          description: description.trim() || undefined,
        }),
      });

      if (res.ok) {
        setStatusMessage('Exhibition settings saved.');
        onSaved();
      } else {
        setError(`Error saving: ${await res.text()}`);
      }
    } catch {
      setError('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wb-sheetwrap">
      <div className="vbg" />
      <div className="wb-sheet">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid var(--reda-parch-border)', paddingBottom: '16px' }}>
            <span
              style={{
                fontFamily: 'var(--reda-ui)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: 'var(--reda-oxblood)',
              }}
            >
              Setup · Identity &amp; Space
            </span>
            <h2
              style={{
                fontFamily: 'var(--reda-display)',
                fontWeight: 500,
                fontSize: '28px',
                color: 'var(--reda-ink)',
                margin: '6px 0 2px',
              }}
            >
              Exhibition Settings
            </h2>
            <p style={{ fontFamily: 'var(--reda-text)', fontSize: '14px', color: 'var(--reda-ink-2)', margin: 0 }}>
              Public Link: <strong>/e/{exhibition.slug}</strong>
            </p>
          </div>

          {statusMessage && (
            <div style={{ background: 'var(--reda-success-bg)', color: 'var(--reda-success)', border: '1px solid var(--reda-success-border)', padding: '10px 14px', borderRadius: '4px', fontSize: '13px' }}>
              {statusMessage}
            </div>
          )}
          {error && (
            <div style={{ background: 'var(--reda-error-bg)', color: 'var(--reda-error)', border: '1px solid var(--reda-error-border)', padding: '10px 14px', borderRadius: '4px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <TextField
            id="setup-title"
            label="Exhibition Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextField
            id="setup-curator"
            label="Curator Name"
            value={curatorName}
            onChange={(e) => setCuratorName(e.target.value)}
            placeholder="e.g. Elena Rostova"
          />

          <SelectField
            id="setup-room"
            label="3D Gallery Space / Room *"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
          >
            <option value="">-- Choose 3D Gallery Space --</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.is_public ? '(Public)' : '(Custom)'}
              </option>
            ))}
          </SelectField>

          {/* 3D Start Vantage Point */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0,0,0,0.03)',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid var(--reda-border)',
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--reda-ink)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="pin" size={13} />
                <span>3D Starting Vantage Point</span>
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--reda-ink-2)' }}>
                {currentSpawn
                  ? hasCustomSpawn
                    ? `Custom Start: ${formatSpawnCoordinates(currentSpawn)}`
                    : `Room Default: ${formatSpawnCoordinates(currentSpawn)}`
                  : 'Default room entrance position'}
              </p>
            </div>
            {hasCustomSpawn && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const clearedSettings = serializeSpawnPoint(null, exhibition.settings_json);
                  try {
                    const res = await fetch(`/api/exhibitions/${exhibition.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ settings_json: clearedSettings }),
                    });
                    if (res.ok) {
                      onSaved();
                    }
                  } catch {}
                }}
                title="Reset custom start point to room default"
              >
                Reset to Default
              </Button>
            )}
          </div>

          <div className="reda-field">
            <label className="reda-field__label">Exhibition Format</label>
            <SegmentedControl<'solo' | 'group'>
              ariaLabel="Solo or Group Exhibition"
              value={curationType}
              onChange={setCurationType}
              options={[
                { value: 'solo', label: 'Solo Artist' },
                { value: 'group', label: 'Group / Collective' },
              ]}
            />
          </div>

          {onManageArtists && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '12px 16px', borderRadius: '6px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--reda-ink)' }}>Artists in Exhibition</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--reda-ink-2)' }}>
                  {exhibition.artists?.length ?? 0} artist profile(s) configured.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onManageArtists}>
                <Icon name="users" size={14} /> Manage Artists
              </Button>
            </div>
          )}

          <TextArea
            id="setup-description"
            label="Curatorial Statement / Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Enter curatorial wall text or retrospective overview…"
          />

          <div className="form-group">
            <label htmlFor="setup-intro-video" className="form-label">
              Intro Video File ID or URL (Optional)
            </label>
            <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
              <input
                id="setup-intro-video"
                type="text"
                value={introVideoFileId}
                onChange={(e) => setIntroVideoFileId(extractGoogleDriveFileId(e.target.value) || e.target.value)}
                placeholder="Paste Google Drive link or ID"
                className="input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <DriveFilePicker
                isTeam={isTeam}
                mimeTypes="video/*"
                onPicked={(fileId: string) => setIntroVideoFileId(fileId)}
              />
            </div>
          </div>

          <SelectField
            id="setup-transition"
            label="Intro Cinema Transition"
            value={introTransition}
            onChange={(e) => setIntroTransition(e.target.value as IntroTransition)}
          >
            {INTRO_TRANSITIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </SelectField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--reda-parch-border)' }}>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Exhibition Details'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
