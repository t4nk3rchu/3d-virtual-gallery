/**
 * SettingsModal — In-Viewer Customizer for Visitor Preferences
 *
 * Allows real-time customization of:
 *   - 3D perspective tilt on 2D inspect view (enable / disable)
 *   - Walking and sprint speed
 *   - Mouse & touch sensitivity and axis inversion
 *   - Camera Field of View (FOV)
 * Persisted in localStorage.
 */
import { useState, useCallback } from 'react';
import type { IntroTransition } from '../../lib/viewer/intro-animations';
import { Icon, Toggle } from '../ui';

export interface ViewerSettings {
  tiltEnabled: boolean;
  introTransition: IntroTransition;
  walkSpeed: number;
  sprintSpeed: number;
  invertMouseX: boolean;
  invertMouseY: boolean;
  mouseSensitivity: number;
  invertTouchX: boolean;
  invertTouchY: boolean;
  touchSensitivity: number;
  fov: number;
}

export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  tiltEnabled: true,
  introTransition: 'zoom_in',
  walkSpeed: 0.02,
  sprintSpeed: 0.045,
  invertMouseX: false,
  invertMouseY: false,
  mouseSensitivity: 2000,
  invertTouchX: true,
  invertTouchY: true,
  touchSensitivity: 2000,
  fov: 65,
};

const STORAGE_KEY = 'virtual_gallery_viewer_settings_v1';

export function getStoredViewerSettings(): ViewerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_VIEWER_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_VIEWER_SETTINGS };
}

export function saveStoredViewerSettings(settings: ViewerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface SettingsModalProps {
  settings: ViewerSettings;
  onChange(newSettings: ViewerSettings): void;
  onClose(): void;
}

export function SettingsModal({ settings, onChange, onClose }: SettingsModalProps) {
  const [local, setLocal] = useState<ViewerSettings>(settings);

  const update = useCallback(
    (patch: Partial<ViewerSettings>) => {
      const updated = { ...local, ...patch };
      setLocal(updated);
      saveStoredViewerSettings(updated);
      onChange(updated);
    },
    [local, onChange]
  );

  const resetDefaults = useCallback(() => {
    setLocal(DEFAULT_VIEWER_SETTINGS);
    saveStoredViewerSettings(DEFAULT_VIEWER_SETTINGS);
    onChange(DEFAULT_VIEWER_SETTINGS);
  }, [onChange]);

  return (
    <div className="settings-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Viewer Settings">
        <header className="settings-modal__header">
          <h2><Icon name="gear" size={18} /> Gallery &amp; Control Settings</h2>
          <button type="button" className="settings-modal__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="settings-modal__body">
          {/* Section 1: Camera & Field of View */}
          <section className="settings-section">
            <h3><Icon name="palette" size={14} /> Camera &amp; Display</h3>

            <div className="settings-slider-group">
              <div className="settings-slider-header">
                <span>Field of View (FOV)</span>
                <span>{local.fov}°</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="1"
                value={local.fov}
                onChange={(e) => update({ fov: Number(e.target.value) })}
                className="range-input"
              />
              <div className="slider-labels">
                <span>Narrow (50°)</span>
                <span>Default (65°)</span>
                <span>Wide (90°)</span>
              </div>
            </div>
          </section>

          {/* Section 2: Walking Movement */}
          <section className="settings-section">
            <h3><Icon name="walk" size={14} /> Movement Speed (WASD / Arrows)</h3>

            <div className="settings-slider-group">
              <div className="settings-slider-header">
                <span>Walking Speed</span>
                <span>{Math.round(local.walkSpeed * 1000)}</span>
              </div>
              <input
                type="range"
                min="0.008"
                max="0.04"
                step="0.002"
                value={local.walkSpeed}
                onChange={(e) => update({ walkSpeed: Number(e.target.value) })}
                className="range-input"
              />
              <div className="slider-labels">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>

            <div className="settings-slider-group">
              <div className="settings-slider-header">
                <span>Sprint Speed (Holding Shift)</span>
                <span>{Math.round(local.sprintSpeed * 1000)}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.08"
                step="0.005"
                value={local.sprintSpeed}
                onChange={(e) => update({ sprintSpeed: Number(e.target.value) })}
                className="range-input"
              />
            </div>
          </section>

          {/* Section 3: Desktop Controls */}
          <section className="settings-section">
            <h3><Icon name="mouse" size={14} /> Desktop Mouse Look</h3>

            <div className="settings-toggles-grid">
              <div className="settings-toggle-item">
                <span>Invert Horizontal (X)</span>
                <Toggle
                  checked={local.invertMouseX}
                  onChange={(val) => update({ invertMouseX: val })}
                  label="Invert Horizontal (X)"
                />
              </div>

              <div className="settings-toggle-item">
                <span>Invert Vertical (Y)</span>
                <Toggle
                  checked={local.invertMouseY}
                  onChange={(val) => update({ invertMouseY: val })}
                  label="Invert Vertical (Y)"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Mobile Touch Controls */}
          <section className="settings-section">
            <h3><Icon name="phone" size={14} /> Mobile Touch Drag Look</h3>

            <div className="settings-toggles-grid">
              <div className="settings-toggle-item">
                <span>Invert Horizontal (X)</span>
                <Toggle
                  checked={local.invertTouchX}
                  onChange={(val) => update({ invertTouchX: val })}
                  label="Invert Horizontal (X)"
                />
              </div>

              <div className="settings-toggle-item">
                <span>Invert Vertical (Y)</span>
                <Toggle
                  checked={local.invertTouchY}
                  onChange={(val) => update({ invertTouchY: val })}
                  label="Invert Vertical (Y)"
                />
              </div>
            </div>
          </section>
        </div>

        <footer className="settings-modal__footer">
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetDefaults}>
            Reset to Defaults
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
