import { proxyMediaUrl } from '../media/gdrive';
import { decimateGlb } from './model-decimation';

/**
 * Fetch the picked full GLB (through the media proxy), decimate it in-browser,
 * and upload the resulting proxy GLB via `uploadFn`. Returns the proxy file id.
 */
export async function generateAndUploadProxy(
  fullFileId: string,
  uploadFn: (bytes: Uint8Array, name: string) => Promise<string>,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchFn(proxyMediaUrl(fullFileId));
  if (!res.ok) throw new Error(`Failed to fetch model for decimation (${res.status})`);
  const full = await res.arrayBuffer();
  const proxy = await decimateGlb(full, { ratio: 0.5 });
  return uploadFn(proxy, `${fullFileId}-proxy.glb`);
}
