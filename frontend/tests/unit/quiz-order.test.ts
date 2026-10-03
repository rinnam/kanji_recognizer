import { describe, expect, it } from 'vitest';
import { orderQuestions } from '../../src/features/quiz/model/order';
import type { QuizQuestion } from '../../src/features/quiz/model/types';

function q(id: string, createdAt: string): QuizQuestion {
  return {
    vocabularyId: id,
    type: 'meaning',
    prompt: id,
    acceptedAnswers: [id],
    createdAt,
  };
}

// Thứ tự nhập cố tình xáo so với createdAt.
const base: QuizQuestion[] = [
  q('c', '2026-01-03T00:00:00.000Z'),
  q('a', '2026-01-01T00:00:00.000Z'),
  q('d', '2026-01-04T00:00:00.000Z'),
  q('b', '2026-01-02T00:00:00.000Z'),
];

describe('quiz/order orderQuestions', () => {
  it('TẮT xáo: sắp theo createdAt tăng dần, KHÔNG đụng mảng gốc', () => {
    const out = orderQuestions(base, false, 123);
    expect(out.map((x) => x.vocabularyId)).toEqual(['a', 'b', 'c', 'd']);
    expect(base.map((x) => x.vocabularyId)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('TẮT xáo: cùng createdAt → tie-break theo vocabularyId (ổn định)', () => {
    const same = [
      q('y', '2026-01-01T00:00:00.000Z'),
      q('x', '2026-01-01T00:00:00.000Z'),
      q('z', '2026-01-01T00:00:00.000Z'),
    ];
    expect(orderQuestions(same, false, 0).map((x) => x.vocabularyId)).toEqual(['x', 'y', 'z']);
  });

  it('BẬT xáo: cùng seed ⇒ cùng thứ tự (tất định); giữ đủ phần tử', () => {
    const a = orderQuestions(base, true, 42).map((x) => x.vocabularyId);
    const b = orderQuestions(base, true, 42).map((x) => x.vocabularyId);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('BẬT xáo: khác seed ⇒ thứ tự khác (bộ đủ lớn), vẫn cùng tập phần tử', () => {
    const many: QuizQuestion[] = Array.from({ length: 12 }, (_, i) =>
      q(`w${String(i)}`, `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    const a = orderQuestions(many, true, 42).map((x) => x.vocabularyId);
    const c = orderQuestions(many, true, 7).map((x) => x.vocabularyId);
    expect(a).not.toEqual(c);
    expect([...a].sort()).toEqual([...c].sort());
  });
});
