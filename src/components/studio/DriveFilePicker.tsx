import { useState } from 'react';
import { openGoogleDrivePicker, shareFileWithServiceAccount } from '../../lib/studio/google-picker';
import { fetchAndRegisterToken } from '../../lib/media/media-tokens';

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
  const [shareError, setShareError] = useState<string | null>(null);

  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const appId = (import.meta as any).env?.VITE_GOOGLE_APP_ID || '';
  const developerKey = (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';

  if (!clientId || !appId) {
    return null;
  }

  const handleClick = async () => {
    setIsLoading(true);
    setShareError(null);
    try {
      await openGoogleDrivePicker({
        clientId,
        appId,
        developerKey: developerKey || undefined,
        mimeTypes,
        isTeam,
        onPicked: async (fileId) => {
          // Grant the service account read access so the Worker can serve it.
          try {
            await shareFileWithServiceAccount(fileId);
          } catch (err) {
            console.error('Failed to share picked file with service account:', err);
            setShareError(
              'File selected, but granting the Reda service account access failed. ' +
                'The media may not load until you share it with the service account manually.'
            );
          }
          // Mint a token so the just-picked file previews before the next save/refetch.
          await fetchAndRegisterToken(fileId).catch(() => {});
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
    <>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? 'Opening…' : buttonLabel}
      </button>
      {shareError && (
        <p role="alert" style={{ color: 'var(--reda-danger, #b3261e)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
          {shareError}
        </p>
      )}
    </>
  );
}
