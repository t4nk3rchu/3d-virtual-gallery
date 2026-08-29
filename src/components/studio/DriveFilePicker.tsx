import { useState } from 'react';
import { isAnyoneWithLink } from '../../lib/studio/drive-share';
import { openGoogleDrivePicker, getCachedDriveToken } from '../../lib/studio/google-picker';

interface DriveFilePickerProps {
  mimeTypes: string;
  isTeam?: boolean;
  onPicked(fileId: string): void;
  onRejected?(fileName: string): void;
  buttonLabel?: string;
  className?: string;
}

export function DriveFilePicker({
  mimeTypes,
  isTeam = false,
  onPicked,
  onRejected,
  buttonLabel = '📁 Pick from Google Drive',
  className = 'btn btn--secondary btn--sm',
}: DriveFilePickerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const appId = (import.meta as any).env?.VITE_GOOGLE_APP_ID || '';
  const developerKey = (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';

  if (!clientId || !appId) {
    return null;
  }

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await openGoogleDrivePicker({
        clientId,
        appId,
        developerKey: developerKey || undefined,
        mimeTypes,
        isTeam,
        onPicked: async (fileId, fileName) => {
          setIsLoading(false);
          const token = getCachedDriveToken();
          if (token) {
            try {
              const res = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(type)&supportsAllDrives=true`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (res.ok) {
                const data = await res.json();
                if (isAnyoneWithLink(data.permissions ?? [])) {
                  onPicked(fileId);
                  return;
                } else {
                  onRejected?.(fileName);
                  return;
                }
              }
            } catch {
              // network error during validation — reject to be safe
              onRejected?.(fileName);
              return;
            }
          }
          // No valid token: reject so the curator knows to re-open the picker
          onRejected?.(fileName);
        },
        onCancel: () => {
          setIsLoading(false);
        },
        onError: (err) => {
          console.warn('Google Drive Picker encountered an error:', err);
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error('Error invoking Google Drive Picker:', err);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? '⏳ Opening...' : buttonLabel}
    </button>
  );
}
