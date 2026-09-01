/**
 * Direct Google Drive Picker loader & controller.
 * Bypasses problematic custom web-components for rock-solid stability and zero DOM pollution.
 */

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

let gapiLoadedPromise: Promise<void> | null = null;
let gsiLoadedPromise: Promise<void> | null = null;
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0; // ponytail: epoch ms; 0 = expired

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export async function ensureGooglePickerLoaded(): Promise<void> {
  if (!gapiLoadedPromise) {
    gapiLoadedPromise = (async () => {
      await loadScript('https://apis.google.com/js/api.js');
      await new Promise<void>((resolve) => {
        window.gapi.load('picker', () => resolve());
      });
    })();
  }

  if (!gsiLoadedPromise) {
    gsiLoadedPromise = loadScript('https://accounts.google.com/gsi/client');
  }

  await Promise.all([gapiLoadedPromise, gsiLoadedPromise]);
}

export interface OpenDrivePickerOptions {
  clientId: string;
  appId: string;
  developerKey?: string;
  mimeTypes: string;
  isTeam?: boolean;
  onPicked: (fileId: string, fileName: string) => void;
  onCancel?: () => void;
  onError?: (error: any) => void;
}

export async function openGoogleDrivePicker(options: OpenDrivePickerOptions): Promise<void> {
  const {
    clientId,
    appId,
    developerKey,
    mimeTypes,
    isTeam = false,
    onPicked,
    onCancel,
    onError,
  } = options;

  try {
    await ensureGooglePickerLoaded();

    const launchPickerWithToken = (token: string) => {
      try {
        const google = window.google;
        if (!google?.picker) {
          throw new Error('Google Picker library is not loaded');
        }

        const builder = new google.picker.PickerBuilder()
          .setAppId(appId)
          .setOAuthToken(token)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              const doc = data.docs?.[0];
              if (doc?.id) {
                onPicked(doc.id, doc.name || 'Selected file');
              }
            } else if (data.action === google.picker.Action.CANCEL) {
              onCancel?.();
            }
          });

        if (developerKey) {
          builder.setDeveloperKey(developerKey);
        }

        // 1. My Drive Tab
        const myDriveView = new google.picker.DocsView(google.picker.ViewId.DOCS)
          .setMimeTypes(mimeTypes)
          .setIncludeFolders(true)
          .setOwnedByMe(true);
        builder.addView(myDriveView);

        // 2. Shared Drives Tab
        const sharedDrivesView = new google.picker.DocsView(google.picker.ViewId.DOCS)
          .setMimeTypes(mimeTypes)
          .setIncludeFolders(true)
          .setEnableDrives(true);
        builder.addView(sharedDrivesView);

        // 3. Shared with Me Tab (Team / Curator)
        if (isTeam) {
          const sharedWithMeView = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setMimeTypes(mimeTypes)
            .setIncludeFolders(true)
            .setOwnedByMe(false);
          builder.addView(sharedWithMeView);
        }

        const picker = builder.build();
        picker.setVisible(true);

        // Force viewport repositioning after popup focus returns
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
      } catch (err) {
        console.error('Failed to build Google Picker:', err);
        onError?.(err);
      }
    };

    // Use cached token if still valid; clear and re-auth if expired
    if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
      launchPickerWithToken(cachedAccessToken);
      return;
    }
    cachedAccessToken = null;

    // Otherwise, request access token via Google Identity Services
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.error) {
          console.error('Google OAuth token error:', response);
          onError?.(response);
          return;
        }
        if (response.access_token) {
          cachedAccessToken = response.access_token;
          cachedTokenExpiry = Date.now() + ((response.expires_in ?? 3600) - 60) * 1000;
          launchPickerWithToken(response.access_token);
        }
      },
      error_callback: (err: any) => {
        console.error('Google OAuth init error:', err);
        onError?.(err);
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  } catch (err) {
    console.error('Error opening Google Drive Picker:', err);
    onError?.(err);
  }
}

export function getCachedDriveToken(): string | null {
  return cachedAccessToken && Date.now() < cachedTokenExpiry ? cachedAccessToken : null;
}

let cachedSaEmail: string | null = null;

async function getServiceAccountEmail(): Promise<string> {
  if (cachedSaEmail) return cachedSaEmail;
  const res = await fetch('/api/config', { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load service account config');
  const data = (await res.json()) as { serviceAccountEmail?: string };
  if (!data.serviceAccountEmail) throw new Error('Service account email not configured on the server');
  cachedSaEmail = data.serviceAccountEmail;
  return cachedSaEmail;
}

/**
 * Grant the Reda service account read access to a picked file, so the Worker
 * (which fetches media as the SA) can serve it. Uses the picker's drive.file
 * token, which permits managing permissions on files the app opened.
 * sendNotificationEmail=false because service accounts can't receive email.
 */
export async function shareFileWithServiceAccount(fileId: string): Promise<void> {
  const token = getCachedDriveToken();
  if (!token) throw new Error('Drive authorization expired — re-open the picker and try again.');
  const saEmail = await getServiceAccountEmail();
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions` +
    `?supportsAllDrives=true&sendNotificationEmail=false`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: saEmail }),
  });
  if (!res.ok) {
    throw new Error(`Sharing with the service account failed (${res.status}): ${await res.text()}`);
  }
}
