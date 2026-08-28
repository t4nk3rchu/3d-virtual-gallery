import { describe, it, expect } from 'vitest';
import { INTRO_TRANSITIONS, getIntroAnimation } from './intro-animations';

describe('intro-animations registry & presets', () => {
  it('contains all 6 transition animation presets', () => {
    const ids = INTRO_TRANSITIONS.map((p) => p.id);
    expect(ids).toContain('fade');
    expect(ids).toContain('zoom_in');
    expect(ids).toContain('blur_fade');
    expect(ids).toContain('iris_circle');
    expect(ids).toContain('slide_up');
    expect(ids).toContain('flash_white');
  });

  it('retrieves specific animation by id', () => {
    const anim = getIntroAnimation('blur_fade');
    expect(anim.id).toBe('blur_fade');
    expect(anim.label).toBe('Dreamy Blur Dissolve');
    expect(anim.cssClass).toBe('intro-video-overlay--blur-fade');
  });

  it('falls back to default preset on unknown id', () => {
    const anim = getIntroAnimation('non_existent' as any);
    expect(anim.id).toBe('fade');
  });
});
