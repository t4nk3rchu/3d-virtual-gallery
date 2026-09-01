import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VirtualJoystick } from './VirtualJoystick';

describe('VirtualJoystick', () => {
  it('renders SVG icon arrows, not glyph characters', () => {
    const { container } = render(<VirtualJoystick onMove={() => {}} />);
    expect(container.querySelectorAll('.reda-icon').length).toBeGreaterThanOrEqual(4);
    expect(container.textContent ?? '').not.toMatch(/[▲▼◀▶]/);
  });
});
