import { useState } from 'react';
import { openGoogleDrivePicker } from '../../lib/studio/google-picker';

interface DriveFilePickerProps {
  mimeTypes: string;
  isTeam?: boolean;
  onPicked(fileId: string): void;
  buttonLabel?: string;
  className?: string;
}

export function DriveFilePicker({
  mimeTypes,
  isTeam = false,
  onPicked,
  buttonLabel = 'Pick from Google Drive',
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
        onPicked: (fileId) => {
          setIsLoading(false);
          onPicked(fileId);
        },
        onCancel: () => setIsLoading(false),
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
      {isLoading ? 'Opening…' : buttonLabel}
    </button>
  );
}
