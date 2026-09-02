import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingCurtain } from './LoadingCurtain';

describe('LoadingCurtain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders exhibition title, curator name, and initial progress', () => {
    render(
      <LoadingCurtain
        title="Florentine Masterpieces"
        curatorName="Elena Rostova"
        progress={25}
        isReady={false}
        onRevealed={() => {}}
      />
    );

    expect(screen.getByText('Florentine Masterpieces')).toBeInTheDocument();
    expect(screen.getByText(/Curated by Elena Rostova/i)).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Opening Curatorial Archive…')).toBeInTheDocument();
  });

  it('updates stage phrases as progress increases', () => {
    const { rerender } = render(
      <LoadingCurtain
        title="Florentine Masterpieces"
        progress={50}
        isReady={false}
        onRevealed={() => {}}
      />
    );

    expect(screen.getByText('Streaming 3D Spatial Geometry…')).toBeInTheDocument();

    rerender(
      <LoadingCurtain
        title="Florentine Masterpieces"
        progress={85}
        isReady={false}
        onRevealed={() => {}}
      />
    );

    expect(screen.getByText('Illuminating Gallery Spotlights & Frames…')).toBeInTheDocument();

    rerender(
      <LoadingCurtain
        title="Florentine Masterpieces"
        progress={100}
        isReady={true}
        onRevealed={() => {}}
      />
    );

    expect(screen.getByText('Gallery Room Prepared')).toBeInTheDocument();
  });

  it('triggers transition and calls onRevealed after duration when isReady becomes true', () => {
    const onRevealed = vi.fn();
    const { container, rerender } = render(
      <LoadingCurtain
        title="Florentine Masterpieces"
        progress={90}
        isReady={false}
        transitionStyle="slide_up"
        onRevealed={onRevealed}
      />
    );

    expect(container.querySelector('.loading-curtain--revealing')).not.toBeInTheDocument();
    expect(onRevealed).not.toHaveBeenCalled();

    rerender(
      <LoadingCurtain
        title="Florentine Masterpieces"
        progress={100}
        isReady={true}
        transitionStyle="slide_up"
        onRevealed={onRevealed}
      />
    );

    expect(container.querySelector('.loading-curtain--revealing')).toBeInTheDocument();
    expect(container.querySelector('.intro-video-overlay--slide-up')).toBeInTheDocument();

    // Fast-forward past animation duration (800ms)
    act(() => {
      vi.advanceTimersByTime(850);
    });

    expect(onRevealed).toHaveBeenCalledTimes(1);
  });
});
