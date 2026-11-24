import { describe, expect, it } from 'vitest';
import { tokenizeText } from '../../src/services/tokenizer.service.js';

describe('tokenizer.service tokenizeText', () => {
  it('trả về mảng rỗng khi chuỗi rỗng', async () => {
    const tokens = await tokenizeText('');
    expect(tokens).toEqual([]);
  });

  it('phân tách câu tiếng Nhật và sinh furigana dạng hiragana', async () => {
    const tokens = await tokenizeText('自然な日本語');
    expect(tokens.length).toBeGreaterThanOrEqual(3);

    const first = tokens[0];
    expect(first?.surface).toBe('自然');
    expect(first?.reading).toBe('しぜん');
    expect(first?.pos).toBe('noun');

    const last = tokens.find((t) => t.surface === '日本語');
    expect(last).toBeDefined();
    expect(last?.reading).toBe('にほんご');
    expect(last?.pos).toBe('noun');
  });

  it('phân loại đúng trợ từ và động từ', async () => {
    const tokens = await tokenizeText('本を読む');
    const wo = tokens.find((t) => t.surface === 'を');
    expect(wo?.pos).toBe('particle');

    const yomu = tokens.find((t) => t.surface === '読む');
    expect(yomu?.pos).toBe('verb');
    expect(yomu?.reading).toBe('よむ');
  });
});
