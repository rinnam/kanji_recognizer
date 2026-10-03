import { afterEach, describe, expect, it } from 'vitest';
import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToggleIconButton } from '../../src/shared/ui';

afterEach(cleanup);

/** Bọc controlled: giữ state `pressed` và cập nhật qua onPressedChange (để test tương tác). */
function Harness(): ReactElement {
  const [on, setOn] = useState(false);
  return (
    <ToggleIconButton
      pressed={on}
      onPressedChange={setOn}
      label="Xáo trộn"
      icon={<span>S</span>}
    />
  );
}

describe('shared/ui ToggleIconButton', () => {
  it('mặc định TẮT: aria-pressed=false và không có class is-on', () => {
    render(<Harness />);
    const btn = screen.getByRole('button', { name: 'Xáo trộn' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn.className).not.toContain('is-on');
  });

  it('bấm → aria-pressed=true + gắn class is-on; bấm lần nữa trở lại cũ', () => {
    render(<Harness />);
    const btn = screen.getByRole('button', { name: 'Xáo trộn' });

    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.className).toContain('is-on');

    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn.className).not.toContain('is-on');
  });
});
