import { useState, useEffect, type FormEvent } from 'react';
import type { ExhibitionDetail, Room } from '../../../types/schema';
import { INTRO_TRANSITIONS, getIntroAnimation, type IntroTransition } from '../../../lib/viewer/intro-animations';
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
  const [ambientAudioFileId, setAmbientAudioFileId] = useState(() => {
    try { return JSON.parse(exhibition.settings_json ?? '{}')?.backgroundAudioFileId ?? ''; } catch { return ''; }
  });

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setError(null);

    try {
      const existingSettings = (() => { try { return JSON.parse(exhibition.settings_json ?? '{}'); } catch { return {}; } })();
      const mergedSettings: Record<string, unknown> = { ...existingSettings, introTransition };
      if (ambientAudioFileId.trim()) {
        mergedSettings.backgroundAudioFileId = ambientAudioFileId.trim();
      } else {
        delete mergedSettings.backgroundAudioFileId;
      }

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
          description: description.trim() || undefined,
          settings_json: JSON.stringify(mergedSettings),
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

          {/* Room Ambient Audio */}
          <div className="form-group">
            <label htmlFor="setup-ambient-audio" className="form-label">
              Room Ambient Audio (Optional)
            </label>
            <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
              <input
                id="setup-ambient-audio"
                type="text"
                value={ambientAudioFileId}
                onChange={(e) => setAmbientAudioFileId(extractGoogleDriveFileId(e.target.value) || e.target.value)}
                placeholder="Paste Google Drive link or file ID"
                className="input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <DriveFilePicker
                isTeam={isTeam}
                mimeTypes="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
                buttonLabel="Pick Audio"
                onPicked={(fileId) => setAmbientAudioFileId(fileId)}
              />
            </div>
            <p className="hint" style={{ marginTop: '4px' }}>
              Plays on loop when a visitor enters the exhibition. Loops automatically.
            </p>
          </div>

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
              <Button type="button" variant="secondary" size="sm" onClick={onManageArtists}>
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

          <IntroTransitionPreview transition={introTransition} />

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

function IntroTransitionPreview({ transition }: { transition: IntroTransition }) {
  const preset = getIntroAnimation(transition);
  const [phase, setPhase] = useState<'video' | 'transitioning' | 'gallery'>('video');
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    // Stage 1: Show Intro Video clearly for 1.4s
    setPhase('video');
    const t1 = setTimeout(() => {
      // Stage 2: Trigger slow, cinematic transition (2.0s duration)
      setPhase('transitioning');
    }, 1400);

    // Stage 3: After transition finishes (1.4s + 2.0s), show 3D Gallery space for 2.2s
    const t2 = setTimeout(() => {
      setPhase('gallery');
    }, 3400);

    // Stage 4: Loop back to video
    const t3 = setTimeout(() => {
      setCycle((c) => c + 1);
    }, 5600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [transition, cycle]);

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--reda-parch-border)',
        borderRadius: '8px',
        padding: '14px 16px',
        marginTop: '-8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span
            style={{
              fontFamily: 'var(--reda-ui)',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--reda-oxblood)',
            }}
          >
            Live Transition Preview · {preset.label}
          </span>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--reda-text)', fontSize: '13px', color: 'var(--reda-ink-2)' }}>
            {preset.description}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCycle((c) => c + 1)}
          title="Replay Transition Animation"
        >
          <Icon name="play" size={13} /> Replay
        </Button>
      </div>

      <div
        style={{
          position: 'relative',
          height: '140px',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.18)',
          boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Background Layer: 3D Gallery Space Simulation */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(120% 90% at 50% 30%, #4a3e32 0%, #241d16 55%, #120e0a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '65px',
              background: '#2b231b',
              border: '2px solid #b98a3c',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--reda-display)',
                fontSize: '10px',
                color: '#e8dcbe',
                fontStyle: 'italic',
              }}
            >
              Gallery Wall
            </span>
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '10px',
              fontFamily: 'var(--reda-ui)',
              fontSize: '8.5px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--reda-gold)',
              background: 'rgba(0,0,0,0.65)',
              padding: '3px 7px',
              borderRadius: '3px',
              backdropFilter: 'blur(4px)',
            }}
          >
            3D Gallery Room
          </span>
        </div>

        {/* Foreground Layer: Intro Video Frame Simulation with Slow Cinematic Transition */}
        <div
          className={`intro-video-overlay ${
            phase === 'transitioning' || phase === 'gallery'
              ? `intro-video-overlay--fading-out ${preset.cssClass}`
              : ''
          }`}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: 'linear-gradient(145deg, #1d1b17, #0b0a08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition:
              'opacity 2.0s cubic-bezier(0.16, 1, 0.3, 1), transform 2.0s cubic-bezier(0.16, 1, 0.3, 1), filter 2.0s cubic-bezier(0.16, 1, 0.3, 1), clip-path 2.0s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(185, 138, 60, 0.2)',
              border: '1px solid #b98a3c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fffdf8',
            }}
          >
            <Icon name="film" size={15} />
          </div>
          <span
            style={{
              fontFamily: 'var(--reda-ui)',
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#fffdf8',
            }}
          >
            Curator Intro Video
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '10px',
              fontFamily: 'var(--reda-ui)',
              fontSize: '8.5px',
              color: 'var(--reda-gold)',
              background: 'rgba(0,0,0,0.65)',
              padding: '3px 7px',
              borderRadius: '3px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {phase === 'video'
              ? '1. Video Playing'
              : phase === 'transitioning'
              ? '2. Transitioning (2.0s)…'
              : '3. Entered 3D Space'}
          </span>
        </div>
      </div>
    </div>
  );
}
