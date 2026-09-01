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
