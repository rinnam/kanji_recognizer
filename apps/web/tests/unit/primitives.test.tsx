import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button, Field, Input } from '../../src/shared/ui';

afterEach(cleanup);

/** Smoke test primitive shared/ui (xác nhận jsdom + RTL + jest-dom hoạt động). */
describe('shared/ui primitives', () => {
  it('Button hiển thị nhãn và mặc định type=button', () => {
    render(<Button>Lưu</Button>);
    const button = screen.getByRole('button', { name: 'Lưu' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('Field nối nhãn với ô nhập qua id', () => {
    render(
      <Field id="word" label="Từ">
        <Input id="word" />
      </Field>,
    );
    expect(screen.getByLabelText('Từ').id).toBe('word');
  });
});
