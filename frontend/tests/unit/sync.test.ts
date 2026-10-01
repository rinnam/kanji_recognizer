import { describe, expect, it } from 'vitest';
import {
  isNewer,
  latestIso,
  maxUpdatedAt,
  pickIncomingWinners,
  selectDirty,
  type SyncRecord,
} from '../../src/features/sync/model/engine';

function rec(id: string, updatedAt: string, deletedAt: string | null = null): SyncRecord {
  return { id, updatedAt, deletedAt };
}

const T = {
  a: '2026-01-01T00:00:00.000Z',
  b: '2026-01-02T00:00:00.000Z',
  c: '2026-01-03T00:00:00.000Z',
};

describe('sync/engine selectDirty', () => {
  it('since=null (chưa từng đẩy) → đẩy tất cả', () => {
    const list = [rec('1', T.a), rec('2', T.b)];
    expect(selectDirty(list, null).map((r) => r.id)).toEqual(['1', '2']);
  });

  it('chỉ bản ghi updatedAt > con trỏ (bằng → bỏ, giữ idempotent)', () => {
    const list = [rec('1', T.a), rec('2', T.b), rec('3', T.c)];
    expect(selectDirty(list, T.b).map((r) => r.id)).toEqual(['3']);
  });
});

describe('sync/engine maxUpdatedAt', () => {
  it('rỗng → null', () => {
    expect(maxUpdatedAt([])).toBeNull();
  });

  it('trả updatedAt lớn nhất bất kể thứ tự', () => {
    expect(maxUpdatedAt([rec('1', T.c), rec('2', T.a), rec('3', T.b)])).toBe(T.c);
  });
});

describe('sync/engine latestIso', () => {
  it('bỏ null, chọn mốc muộn nhất; tất cả null → null', () => {
    expect(latestIso([null, T.a, null, T.c, T.b])).toBe(T.c);
    expect(latestIso([null, null])).toBeNull();
  });
});

describe('sync/engine isNewer', () => {
  it('chỉ true khi mới hơn thực sự (so khớp strict >)', () => {
    expect(isNewer(T.b, T.a)).toBe(true);
    expect(isNewer(T.a, T.a)).toBe(false);
    expect(isNewer(T.a, T.b)).toBe(false);
  });
});

describe('sync/engine pickIncomingWinners (merge LWW)', () => {
  it('ghi khi local chưa có hoặc incoming mới hơn; giữ tombstone', () => {
    const local = [rec('1', T.b), rec('2', T.b)];
    const incoming = [
      rec('1', T.c, T.c), // mới hơn + tombstone → thắng
      rec('2', T.a), // cũ hơn → bỏ
      rec('3', T.a), // local chưa có → thắng
    ];
    const winners = pickIncomingWinners(local, incoming);
    expect(winners.map((r) => r.id)).toEqual(['1', '3']);
    expect(winners.find((r) => r.id === '1')?.deletedAt).toBe(T.c);
  });

  it('incoming bằng updatedAt → bỏ qua (không ghi đè bản local)', () => {
    expect(pickIncomingWinners([rec('1', T.b)], [rec('1', T.b)])).toEqual([]);
  });
});
