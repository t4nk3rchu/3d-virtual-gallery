import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kicker, HairlineRule, SectionTitle, Panel } from './primitives';
import { Plate, WallLabel } from './Plate';

describe('primitives', () => {
  it('Kicker renders reda-kicker text', () => {
    render(<Kicker>Now showing</Kicker>);
    expect(screen.getByText('Now showing').className).toContain('reda-kicker');
  });
  it('SectionTitle renders a heading', () => {
    render(<SectionTitle>Artworks</SectionTitle>);
    const h = screen.getByRole('heading', { name: 'Artworks' });
    expect(h.className).toContain('reda-section-title');
  });
  it('HairlineRule renders an hr', () => {
    const { container } = render(<HairlineRule />);
    expect(container.querySelector('hr.reda-rule')).toBeTruthy();
  });
  it('Panel applies parch variant', () => {
    const { container } = render(<Panel variant="parch">x</Panel>);
    expect(container.querySelector('.reda-panel--parch')).toBeTruthy();
  });
  it('Plate renders an img with alt', () => {
    render(<Plate src="/x.jpg" alt="Untitled" />);
    expect((screen.getByAltText('Untitled') as HTMLImageElement).tagName).toBe('IMG');
  });
  it('WallLabel renders title and lines', () => {
    render(<WallLabel title="Untitled" lines={['The Artist', '1974']} />);
    expect(screen.getByText('Untitled')).toBeTruthy();
    expect(screen.getByText('1974')).toBeTruthy();
  });
});
