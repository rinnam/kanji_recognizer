import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScopeBar } from '../../src/shared/ui';

describe('shared/ui/ScopeBar', () => {
  afterEach(cleanup);

  it('phát sự kiện khi đổi chip', () => {
    const onKindChange = vi.fn();
    render(
      <ScopeBar
        total={10}
        used={3}
        kind="all"
        n={3}
        onKindChange={onKindChange}
        onNChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '3 từ đầu' }));
    expect(onKindChange).toHaveBeenCalledWith('first');
  });

  it('khóa chip khi tổng = 0', () => {
    render(
      <ScopeBar total={0} used={0} kind="all" n={1} onKindChange={() => {}} onNChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeDisabled();
  });
});
