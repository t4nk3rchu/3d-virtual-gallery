/**
 * Intro Video to 3D Exhibition Transition Animation Engine
 *
 * Provides configurable animation presets and timing for the transition
 * when the intro video concludes or when the visitor skips to enter the gallery.
 */

export type IntroTransition =
  | 'fade'
  | 'zoom_in'
  | 'blur_fade'
  | 'iris_circle'
  | 'slide_up'
  | 'flash_white';

export interface IntroAnimationPreset {
  id: IntroTransition;
  label: string;
  description: string;
  durationMs: number;
  cssClass: string;
}

export const INTRO_TRANSITIONS: IntroAnimationPreset[] = [
  {
    id: 'fade',
    label: 'Smooth Crossfade',
    description: 'Classic seamless dissolve into the 3D exhibition room.',
    durationMs: 800,
    cssClass: 'intro-video-overlay--fade',
  },
  {
    id: 'zoom_in',
    label: 'Cinematic Push-In Dive',
    description: 'Zooms forward through the video directly into the 3D space.',
    durationMs: 900,
    cssClass: 'intro-video-overlay--zoom-in',
  },
  {
    id: 'blur_fade',
    label: 'Dreamy Blur Dissolve',
    description: 'Soft optic blur defocus melting into the sharp 3D gallery.',
    durationMs: 850,
    cssClass: 'intro-video-overlay--blur-fade',
  },
  {
    id: 'iris_circle',
    label: 'Circular Iris Reveal',
    description: 'Dramatic aperture circle opening outward from center.',
    durationMs: 900,
    cssClass: 'intro-video-overlay--iris-circle',
  },
  {
    id: 'slide_up',
    label: 'Curtain Lift',
    description: 'Theatrical curtain lift sliding up to reveal the space.',
    durationMs: 800,
    cssClass: 'intro-video-overlay--slide-up',
  },
  {
    id: 'flash_white',
    label: 'Gallery Bloom Flash',
    description: 'Bright artistic flash of light blooming into the room.',
    durationMs: 750,
    cssClass: 'intro-video-overlay--flash-white',
  },
];

export function getIntroAnimation(id: IntroTransition | string | undefined | null): IntroAnimationPreset {
  return INTRO_TRANSITIONS.find((p) => p.id === id) || INTRO_TRANSITIONS[0];
}
