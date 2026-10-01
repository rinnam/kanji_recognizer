import { describe, expect, it } from 'vitest';
import { isIncomingNewer } from '../../src/services/sync.service.js';

/**
 * Unit test thuần cho quyết định LWW (ADR 0001). KHÔNG cần DB/mạng, tất định.
 */
describe('isIncomingNewer (LWW decision)', () => {
  const base = '2026-10-01T00:00:00.000Z';
  const later = '2026-10-01T00:00:01.000Z';
  const earlier = '2026-09-30T23:59:59.000Z';

  it('bản client mới hơn → thắng (true)', () => {
    expect(isIncomingNewer(later, base)).toBe(true);
  });

  it('cùng timestamp → bỏ qua (false) — push lặp là no-op idempotent', () => {
    expect(isIncomingNewer(base, base)).toBe(false);
  });

  it('bản client cũ hơn → bỏ qua (false)', () => {
    expect(isIncomingNewer(earlier, base)).toBe(false);
  });

  it('nhận đầu vào kiểu Date cho cả hai phía', () => {
    expect(isIncomingNewer(new Date(later), new Date(base))).toBe(true);
    expect(isIncomingNewer(new Date(base), new Date(base))).toBe(false);
    expect(isIncomingNewer(new Date(earlier), new Date(base))).toBe(false);
  });

  it('trộn Date và chuỗi ISO', () => {
    expect(isIncomingNewer(later, new Date(base))).toBe(true);
    expect(isIncomingNewer(new Date(earlier), base)).toBe(false);
  });
});
