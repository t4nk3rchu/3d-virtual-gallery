import { describe, it, expect, vi } from 'vitest';

vi.mock('./model-decimation', () => ({
  decimateGlb: vi.fn(async () => new Uint8Array([0x67, 0x6c, 0x54, 0x46])), // "glTF"
}));

import { generateAndUploadProxy } from './model-upload';

describe('generateAndUploadProxy', () => {
  it('fetches the full model, decimates it, and uploads the proxy', async () => {
    const fakeFetch = vi.fn(async () => new Response(new ArrayBuffer(64)));
    const upload = vi.fn(async (_bytes: Uint8Array, _name: string) => 'proxy-file-id');
    const id = await generateAndUploadProxy('full-id', upload, fakeFetch as any);
    expect(id).toBe('proxy-file-id');
    expect(upload).toHaveBeenCalledOnce();
    const [, name] = upload.mock.calls[0];
    expect(name).toMatch(/proxy/i);
  });
});
