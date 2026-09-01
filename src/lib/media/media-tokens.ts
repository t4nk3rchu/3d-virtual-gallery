/**
 * Client-side registry of signed media tokens (fileId → "exp.sig"), populated from
 * API responses (media_tokens). The media URL helpers read from here automatically,
 * so call sites that build /api/media URLs don't need to thread tokens through.
 * ponytail: module-global map — a browser SPA singleton, fine for this use.
 */
const tokens = new Map<string, string>();

export function registerMediaTokens(map?: Record<string, string>): void {
  if (!map) return;
  for (const [id, tok] of Object.entries(map)) tokens.set(id, tok);
}

export function getMediaToken(fileId: string): string | undefined {
  return tokens.get(fileId);
}

export function clearMediaTokens(): void {
  tokens.clear();
}

/**
 * Mint + register a token for a single file so it previews immediately —
 * before the exhibition (which normally supplies tokens) is re-fetched.
 * Used right after picking a file in the studio. Best-effort.
 */
export async function fetchAndRegisterToken(fileId: string): Promise<void> {
  const res = await fetch(`/api/media-token/${encodeURIComponent(fileId)}`, { credentials: 'include' });
  if (!res.ok) return;
  const data = (await res.json()) as { token?: string };
  if (data.token) tokens.set(fileId, data.token);
}
