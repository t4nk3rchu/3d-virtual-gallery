/**
 * Studio Authoring & 3D Keybindings Settings Sidebar
 *
 * Slide-out right side panel for curator-specific keybindings,
 * navigation speeds, camera panning speed, and mouse behavior.
 */
import { useState } from 'react';
import { Icon, Button } from '../ui';

export interface StudioKeybindings {
  forward: string;      // e.g. 'KeyW'
  backward: string;     // e.g. 'KeyS'
  left: string;         // e.g. 'KeyA'
  right: string;        // e.g. 'KeyD'
  up: string;           // e.g. 'KeyE'
  down: string;         // e.g. 'KeyQ'
  sprint: string;       // e.g. 'ShiftLeft'
  cameraSpeed: number;  // 1.0 - 10.0 (WASD movement speed)
  panningSpeed: number; // 0.2 - 3.0 (Right-click camera panning speed)
  rightClickMode: 'move_artwork' | 'pan_camera';
  dragSensitivity: number; // 0.2 - 3.0 (Artwork move sensitivity)
}

export const DEFAULT_STUDIO_KEYBINDINGS: StudioKeybindings = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyE',
  down: 'KeyQ',
  sprint: 'ShiftLeft',
  cameraSpeed: 4.0,
  panningSpeed: 1.0,
  rightClickMode: 'move_artwork',
  dragSensitivity: 1.0,
};

const STORAGE_KEY = 'virtual_gallery_studio_keybindings';

export function getStoredStudioSettings(): StudioKeybindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STUDIO_KEYBINDINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STUDIO_KEYBINDINGS;
}

export function saveStoredStudioSettings(settings: StudioKeybindings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface StudioSettingsSidebarProps {
  settings: StudioKeybindings;
  onUpdate(settings: StudioKeybindings): void;
  onClose(): void;
}

export function StudioSettingsSidebar({
  settings,
  onUpdate,
  onClose,
}: StudioSettingsSidebarProps) {
  const [listeningKey, setListeningKey] = useState<keyof StudioKeybindings | null>(null);

  const handleKeyRecord = (action: keyof StudioKeybindings, e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      setListeningKey(null);
      return;
    }
    const updated = { ...settings, [action]: e.code };
    saveStoredStudioSettings(updated);
    onUpdate(updated);
    setListeningKey(null);
  };

  const handleReset = () => {
    saveStoredStudioSettings(DEFAULT_STUDIO_KEYBINDINGS);
    onUpdate(DEFAULT_STUDIO_KEYBINDINGS);
  };

  const formatKeyName = (code: string) => {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'Space') return 'Space';
    return code;
  };

  const renderKeyRow = (label: string, action: keyof StudioKeybindings) => {
    const isRecording = listeningKey === action;
    const currentCode = settings[action] as string;

    return (
      <div className="keybinding-row" key={action}>
        <span className="keybinding-label">{label}</span>
        <button
          type="button"
          className={`keybinding-btn ${isRecording ? 'recording' : ''}`}
          onClick={() => setListeningKey(action)}
          onKeyDown={(e) => isRecording && handleKeyRecord(action, e)}
          title="Click and press a key to rebind"
        >
          {isRecording ? 'Press key…' : formatKeyName(currentCode)}
        </button>
      </div>
    );
  };

  return (
    <aside className="gizmo-settings-sidebar" aria-label="Studio Keybindings & Controls">
      <div className="sidebar-header">
        <div className="header-title">
          <span className="sidebar-icon"><Icon name="cube" /></span>
          <h3>Studio 3D Controls</h3>
        </div>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close settings">
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="sidebar-content">
        {/* Section 1: Keyboard Bindings */}
        <div className="settings-section">
          <h4 className="section-title">Keyboard Navigation</h4>
          <p className="section-subtitle">Click any button to remap key</p>
          <div className="keybindings-grid">
            {renderKeyRow('Move Forward', 'forward')}
            {renderKeyRow('Move Backward', 'backward')}
            {renderKeyRow('Strafe Left', 'left')}
            {renderKeyRow('Strafe Right', 'right')}
            {renderKeyRow('Elevate Up', 'up')}
            {renderKeyRow('Lower Down', 'down')}
            {renderKeyRow('Sprint Boost', 'sprint')}
          </div>
        </div>

        {/* Section 2: Mouse Behavior & Speeds */}
        <div className="settings-section">
          <h4 className="section-title">Mouse Behavior &amp; Speeds</h4>
          <div className="settings-row">
            <div>
              <span className="setting-title">Right-Click Drag Action</span>
              <p className="setting-desc">
                When an artwork is focused, directly drag to move it in the 3D scene.
              </p>
            </div>
            <select
              value={settings.rightClickMode}
              onChange={(e) => {
                const updated = {
                  ...settings,
                  rightClickMode: e.target.value as 'move_artwork' | 'pan_camera',
                };
                saveStoredStudioSettings(updated);
                onUpdate(updated);
              }}
              className="input select select--sm"
            >
              <option value="move_artwork">Move Focused Artwork</option>
              <option value="pan_camera">Always Pan Camera</option>
            </select>
          </div>

          <div className="settings-row">
            <div>
              <span className="setting-title">Camera Movement Speed</span>
              <p className="setting-desc">WASD navigation speed in authoring mode</p>
            </div>
            <div className="slider-control">
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={settings.cameraSpeed}
                onChange={(e) => {
                  const updated = { ...settings, cameraSpeed: parseFloat(e.target.value) };
                  saveStoredStudioSettings(updated);
                  onUpdate(updated);
                }}
                className="settings-slider"
              />
              <span className="slider-value">{settings.cameraSpeed}x</span>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <span className="setting-title">Camera Panning Speed</span>
              <p className="setting-desc">Smooth panning speed when right-click dragging</p>
            </div>
            <div className="slider-control">
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={settings.panningSpeed ?? 1.0}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    panningSpeed: parseFloat(e.target.value),
                  };
                  saveStoredStudioSettings(updated);
                  onUpdate(updated);
                }}
                className="settings-slider"
              />
              <span className="slider-value">{(settings.panningSpeed ?? 1.0).toFixed(1)}x</span>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <span className="setting-title">Direct Move Sensitivity</span>
              <p className="setting-desc">Sensitivity when right-click dragging artworks</p>
            </div>
            <div className="slider-control">
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={settings.dragSensitivity}
                onChange={(e) => {
                  const updated = {
                    ...settings,
                    dragSensitivity: parseFloat(e.target.value),
                  };
                  saveStoredStudioSettings(updated);
                  onUpdate(updated);
                }}
                className="settings-slider"
              />
              <span className="slider-value">{settings.dragSensitivity}x</span>
            </div>
          </div>
        </div>

        {/* Section 3: Mouse Controls Cheat Sheet */}
        <div className="settings-section">
          <h4 className="section-title">Controls Cheat Sheet</h4>
          <ul className="controls-cheatsheet">
            <li><b>Left Click</b>: Select artwork / click background or Esc to unfocus</li>
            <li><b>Middle Mouse Drag</b>: Orbit 360° around view / mouse focus</li>
            <li><b>Right Mouse Drag</b>: Move focused artwork (or pan camera when unfocused)</li>
            <li><b>WASD / Arrows</b>: Roam camera freely in gallery</li>
            <li><b>Shift</b>: Sprint navigation speed boost</li>
            <li><b>Esc</b>: Unfocus to free navigation mode</li>
          </ul>
        </div>
      </div>

      <div className="sidebar-footer">
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Reset Defaults
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </aside>
  );
}
