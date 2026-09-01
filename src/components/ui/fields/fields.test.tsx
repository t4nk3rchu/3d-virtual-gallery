import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';
import { TextArea } from './TextArea';
import { SelectField } from './SelectField';

describe('TextField', () => {
  it('associates a visible label with the input', () => {
    render(<TextField id="t1" label="Title" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Title');
    expect(input.tagName).toBe('INPUT');
    expect(input.className).toContain('reda-field__control');
  });
  it('calls onChange when typed', async () => {
    const onChange = vi.fn();
    render(<TextField id="t2" label="Name" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Name'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
  it('shows an error with role=alert and aria-invalid', () => {
    render(<TextField id="t3" label="Email" value="" onChange={() => {}} error="Required" />);
    expect(screen.getByRole('alert').textContent).toBe('Required');
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });
});
describe('TextArea', () => {
  it('renders a labeled textarea', () => {
    render(<TextArea id="d1" label="Desc" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Desc').tagName).toBe('TEXTAREA');
  });
});
describe('SelectField', () => {
  it('renders a labeled select with options', () => {
    render(
      <SelectField id="s1" label="Room" value="a" onChange={() => {}}>
        <option value="a">A</option><option value="b">B</option>
      </SelectField>
    );
    const sel = screen.getByLabelText('Room') as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect(sel.value).toBe('a');
  });
});
