import { describe, expect, it } from 'vitest';
// Đọc nguyên văn tokens.css (nguồn sự thật) qua Vite `?raw` — không phụ thuộc fs/Node.
import TOKENS_CSS from '../../src/shared/ui/theme/tokens.css?raw';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** '#rgb' hoặc '#rrggbb' → {r,g,b} (0–255). */
function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Kênh sRGB (0–255) → tuyến tính (WCAG 2.x). */
function channelLin(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Độ sáng tương đối (WCAG). */
function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelLin(r) + 0.7152 * channelLin(g) + 0.0722 * channelLin(b);
}

/** Tỉ lệ tương phản WCAG giữa hai màu hex (1 → 21). */
function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Đọc map token (--kn-*: #hex) trong khối { ... } đầu tiên sau `selector`. */
function readTheme(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Không thấy selector ${selector} trong tokens.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const block = css.slice(open + 1, close);
  const map: Record<string, string> = {};
  for (const m of block.matchAll(/(--kn-[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

const THEMES: { name: string; selector: string }[] = [
  { name: 'sáng', selector: "[data-theme='light']" },
  { name: 'tối', selector: "[data-theme='dark']" },
];

describe('shared/ui tokens — tương phản WCAG', () => {
  it('contrastRatio: trắng/đen ≈ 21, cùng màu = 1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  for (const { name, selector } of THEMES) {
    describe(`theme ${name}`, () => {
      const t = readTheme(TOKENS_CSS, selector);

      it('chữ nút / nền nút ≥ 4.5', () => {
        expect(contrastRatio(t['--kn-btn-fg'], t['--kn-btn-bg'])).toBeGreaterThanOrEqual(4.5);
      });

      it('viền nút & viền ô nhập / nền thẻ ≥ 3', () => {
        // Nút và ô nhập dùng chung --kn-btn-border; nền thẻ là --kn-surface.
        expect(contrastRatio(t['--kn-btn-border'], t['--kn-surface'])).toBeGreaterThanOrEqual(3);
      });

      it('chữ chính / nền thẻ ≥ 4.5', () => {
        expect(contrastRatio(t['--kn-text'], t['--kn-surface'])).toBeGreaterThanOrEqual(4.5);
      });

      it('chữ trên accent / nền accent ≥ 4.5', () => {
        expect(
          contrastRatio(t['--kn-primary-contrast'], t['--kn-primary']),
        ).toBeGreaterThanOrEqual(4.5);
      });

      it('chữ tab chưa chọn / nền thanh tab ≥ 4.5', () => {
        // Tab chưa chọn = nút phụ (chữ --kn-btn-fg) đặt trên thanh điều khiển nền --kn-surface.
        expect(contrastRatio(t['--kn-btn-fg'], t['--kn-surface'])).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
