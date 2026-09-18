import { describe, it, expect } from 'vitest';
import { resolveModelProxyUrl } from './model3d-factory';

const base = {
  id: 'a1', exhibition_id: 'e1', title: 'S', artist: 'A', year: null, medium: null,
  dimensions: null, description: null, artwork_type: 'MODEL_3D' as const,
  media_file_id: 'full', youtube_video_id: null, audio_guide_file_id: null,
  transform_json: '{}', frame_config_json: '{}', order_index: 0, updated_at: 1,
};

describe('resolveModelProxyUrl', () => {
  it('returns the proxy media URL when a proxy id is set', () => {
    expect(resolveModelProxyUrl({ ...base, model_proxy_file_id: 'proxy' })).toContain('proxy');
  });
  it('returns null when no proxy id (nothing to render in roam)', () => {
    expect(resolveModelProxyUrl({ ...base, model_proxy_file_id: null })).toBeNull();
  });
});
