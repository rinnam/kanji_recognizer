import { describe, expect, it } from 'vitest';
import { decideQuickAddAction } from '../../src/features/vocabulary/model/quick-add-action';

describe('vocabulary/quick-add-action decideQuickAddAction', () => {
  it("'new' → tạo mới (add)", () => {
    expect(decideQuickAddAction({ kind: 'new' })).toEqual({ kind: 'add' });
  });

  it("'link' → giữ existingId + existingPath để mời gắn", () => {
    expect(decideQuickAddAction({ kind: 'link', existingId: 'v1', existingPath: 'N3' })).toEqual({
      kind: 'link',
      existingId: 'v1',
      existingPath: 'N3',
    });
  });

  it("skip 'in-branch' → chặn, nêu existingPath", () => {
    expect(
      decideQuickAddAction({ kind: 'skip', reason: 'in-branch', existingPath: 'Ôn Thi › B1' }),
    ).toEqual({ kind: 'blocked', message: 'Đã có trong «Ôn Thi › B1»' });
  });

  it("skip 'exists' (chưa chọn thư mục) → chặn, nêu existingPath", () => {
    expect(decideQuickAddAction({ kind: 'skip', reason: 'exists', existingPath: 'N3' })).toEqual({
      kind: 'blocked',
      message: 'Đã có trong «N3»',
    });
  });

  it("skip 'in-file' (không dùng trong Quick Add) → chặn chung", () => {
    expect(decideQuickAddAction({ kind: 'skip', reason: 'in-file' })).toEqual({
      kind: 'blocked',
      message: 'Đã có từ này.',
    });
  });
});
