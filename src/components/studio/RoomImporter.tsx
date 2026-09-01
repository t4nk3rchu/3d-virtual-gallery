import { useState, type ChangeEvent } from 'react';
import type { Room } from '../../types/schema';
import { validateGlbFile, extractGoogleDriveFileId } from '../../lib/studio/validation';
import { DriveFilePicker } from './DriveFilePicker';
import { Button } from '../ui';

interface RoomImporterProps {
  rooms: Room[];
  selectedRoomId: string;
  isTeam?: boolean;
  onSelectRoom(roomId: string): void;
  onRoomCreated?(room: Room): void;
}

export function RoomImporter({
  rooms,
  selectedRoomId,
  isTeam = false,
  onSelectRoom,
  onRoomCreated,
}: RoomImporterProps) {
  const [mode, setMode] = useState<'select' | 'import'>('select');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    warning?: string;
  } | null>(null);
  const [pickedFileSize, setPickedFileSize] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setValidationResult(null);
      setPickedFileSize(null);
      return;
    }
    setPickedFileSize(`${(file.size / 1024 / 1024).toFixed(1)} MB`);
    setValidating(true);
    try {
      const result = await validateGlbFile(file);
      setValidationResult(result);
      if (!name) {
        setName(file.name.replace(/\.glb$/i, '').replace(/[-_]/g, ' '));
      }
    } finally {
      setValidating(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    const input = sourceInput.trim();
    if (!input) {
      setApiError('Please enter a Google Drive link, file ID, or 3D model URL.');
      return;
    }

    // Extract Drive ID if it's a Drive link; otherwise use the direct URL/ID
    const fileId = extractGoogleDriveFileId(input) || input;

    if (validationResult && !validationResult.valid) {
      setApiError(validationResult.error || 'GLB file validation failed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          glb_file_id: fileId,
          glb_source: input.includes('drive.google.com') ? 'curator_drive' : 'platform_drive',
          is_public: 0,
        }),
      });

      if (!res.ok) {
        setApiError(await res.text());
        return;
      }

      const created = (await res.json()) as Room;
      onRoomCreated?.(created);
      onSelectRoom(created.id);
      setMode('select');
    } catch {
      setApiError('Network error while creating room.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="room-importer">
      <div className="room-importer__header">
        <label htmlFor="room-select" className="form-label">
          Exhibition Gallery Architecture
        </label>
        <div className="room-importer__tabs">
          <Button
            type="button"
            variant={mode === 'select' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('select')}
          >
            Select Room ({rooms.length} available)
          </Button>
          <Button
            type="button"
            variant={mode === 'import' ? 'primary' : 'ghost'}
            size="sm"
            iconLeft="plus"
            onClick={() => setMode('import')}
          >
            Add Custom Room GLB
          </Button>
        </div>
      </div>

      {mode === 'select' ? (
        <div className="room-importer__select-group">
          <select
            id="room-select"
            value={selectedRoomId}
            onChange={(e) => onSelectRoom(e.target.value)}
            required
            className="input select"
          >
            <option value="">Choose a gallery space…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.owner_user_id ? '(Custom Room)' : '(Built-in Gallery)'}
              </option>
            ))}
          </select>

          {rooms.length === 0 && (
            <p className="hint">
              No rooms loaded yet. Click <strong>&ldquo;+ Add Custom Room GLB&rdquo;</strong> to add one.
            </p>
          )}
        </div>
      ) : (
        <div className="room-importer__form">
          <div className="form-group">
            <label htmlFor="room-name" className="form-label">
              1. Room Name
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Modernist Pavillion Room"
              required
              className="input"
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label htmlFor="room-source" className="form-label" style={{ marginBottom: 0 }}>
                2. 3D Model Source (Google Drive Link or Direct GLB URL)
              </label>
              <DriveFilePicker
                mimeTypes="model/gltf-binary,application/octet-stream"
                isTeam={isTeam}
                buttonLabel="Pick GLB from Google Drive"
                onPicked={(fileId) => setSourceInput(fileId)}
              />
            </div>
            <input
              id="room-source"
              type="text"
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder="https://drive.google.com/file/d/1A2B3C... or https://example.com/model.glb"
              required
              className="input"
            />
            <p className="hint">
              <strong>For Google Drive:</strong> Ensure the file is shared with the Reda Service Account and paste the link here.
              <br />
              <strong>For Direct URLs:</strong> Must be a publicly accessible <code>.glb</code> file ending in <code>.glb</code>.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="room-file" className="form-label">
              3. (Optional) Check Local GLB Specs &amp; Size
            </label>
            <input
              id="room-file"
              type="file"
              accept=".glb"
              onChange={handleFileChange}
              className="input file-input"
            />
            {pickedFileSize && !validating && !validationResult && (
              <p className="hint">{pickedFileSize} — validating…</p>
            )}
            {validating && <p className="hint">{pickedFileSize} — checking GLB format…</p>}
            {validationResult && (
              <div
                className={`validation-badge ${
                  validationResult.valid
                    ? validationResult.warning
                      ? 'validation-badge--warning'
                      : 'validation-badge--success'
                    : 'validation-badge--error'
                }`}
              >
                {validationResult.error && <span>{validationResult.error}</span>}
                {validationResult.warning && <span>{validationResult.warning}</span>}
                {validationResult.valid && !validationResult.warning && (
                  <span>Valid glTF 2.0 Binary — {pickedFileSize}</span>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="room-desc" className="form-label">
              Description (Optional)
            </label>
            <input
              id="room-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lighting details, architectural features, or room dimensions"
              className="input"
            />
          </div>

          {apiError && <p className="error" role="alert">{apiError}</p>}

          <div className="form-actions">
            <Button
              type="button"
              variant="primary"
              disabled={submitting || (validationResult !== null && !validationResult.valid)}
              onClick={handleImportSubmit}
            >
              {submitting ? 'Saving Room…' : 'Save & Select Room'}
            </Button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setMode('select')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
