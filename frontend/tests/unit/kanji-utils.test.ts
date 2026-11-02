import { describe, expect, it } from 'vitest';
import { lookupKanji } from '../../src/entities/kanji/model/kanji-dict';
import {
  extractKanji,
  isKanji,
  mapSinoForKanjiIndex,
  segmentJapaneseWord,
} from '../../src/entities/kanji/model/kanji-utils';

describe('kanji-utils (isKanji & extractKanji)', () => {
  it('nhận diện chính xác ký tự chữ Hán (Kanji)', () => {
    expect(isKanji('豊')).toBe(true);
    expect(isKanji('重')).toBe(true);
    expect(isKanji('要')).toBe(true);
    expect(isKanji('日')).toBe(true);
    expect(isKanji('本')).toBe(true);

    // Hiragana / Katakana / Latinh / Ký hiệu không phải Kanji
    expect(isKanji('ゆ')).toBe(false);
    expect(isKanji('た')).toBe(false);
    expect(isKanji('か')).toBe(false);
    expect(isKanji('ア')).toBe(false);
    expect(isKanji('A')).toBe(false);
    expect(isKanji('1')).toBe(false);
    expect(isKanji('')).toBe(false);
  });

  it('trích xuất danh sách các chữ Hán duy nhất', () => {
    expect(extractKanji('豊かな')).toEqual(['豊']);
    expect(extractKanji('重要な')).toEqual(['重', '要']);
    expect(extractKanji('学校')).toEqual(['学', '校']);
    expect(extractKanji('時々')).toEqual(['時']); // Chữ lặp hoặc kana
    expect(extractKanji('こんにちは')).toEqual([]);
    expect(extractKanji('')).toEqual([]);
  });
});

describe('kanji-utils (segmentJapaneseWord)', () => {
  it('phân tách từ vựng thành từng khối Kanji và Kana', () => {
    const segments = segmentJapaneseWord('豊かな');
    expect(segments).toEqual([
      { text: '豊', isKanji: true },
      { text: 'かな', isKanji: false },
    ]);
  });

  it('tách riêng từng chữ Kanji cạnh nhau để người học tra cứu riêng lẻ', () => {
    const segments = segmentJapaneseWord('重要');
    expect(segments).toEqual([
      { text: '重', isKanji: true },
      { text: '要', isKanji: true },
    ]);
  });

  it('xử lý chuỗi thuần Kana hoặc rỗng', () => {
    expect(segmentJapaneseWord('ありがとう')).toEqual([
      { text: 'ありがとう', isKanji: false },
    ]);
    expect(segmentJapaneseWord('')).toEqual([]);
  });
});

describe('kanji-utils (mapSinoForKanjiIndex)', () => {
  it('khớp âm Hán Việt tương ứng khi số từ bằng số Kanji', () => {
    expect(mapSinoForKanjiIndex('TRỌNG YẾU', 0, 2)).toBe('TRỌNG');
    expect(mapSinoForKanjiIndex('TRỌNG YẾU', 1, 2)).toBe('YẾU');
    expect(mapSinoForKanjiIndex('HỌC HIỆU', 0, 2)).toBe('HỌC');
    expect(mapSinoForKanjiIndex('HỌC HIỆU', 1, 2)).toBe('HIỆU');
  });

  it('trả về chuỗi nguyên vẹn nếu không tách được hoặc chỉ có 1 Kanji', () => {
    expect(mapSinoForKanjiIndex('PHONG', 0, 1)).toBe('PHONG');
    expect(mapSinoForKanjiIndex(null, 0, 1)).toBeNull();
  });
});

describe('kanji-dict (lookupKanji)', () => {
  it('tra cứu đầy đủ thông tin chữ Hán có sẵn trong từ điển', () => {
    const detail = lookupKanji('豊');
    expect(detail).not.toBeNull();
    expect(detail?.sinoVietnamese).toBe('PHONG');
    expect(detail?.meaning).toContain('Giàu có');
    expect(detail?.onyomi).toContain('ホウ');
    expect(detail?.kunyomi).toContain('ゆた.か');
    expect(detail?.jlptLevel).toBe('N1');
    expect(detail?.strokeCount).toBe(13);
  });

  it('tra cứu đúng nghĩa của chữ Hán đơn lẻ (ví dụ chữ 清 - THANH và 潔 - KHIẾT)', () => {
    // Chữ Thanh đơn lẻ: phải là thanh trong thanh thoát / trong sạch, không phải nghĩa của từ ghép
    const thanh = lookupKanji('清', 'THANH', 'sạch sẽ, vệ sinh');
    expect(thanh).not.toBeNull();
    expect(thanh?.character).toBe('清');
    expect(thanh?.sinoVietnamese).toBe('THANH');
    expect(thanh?.meaning).toContain('thanh thoát');
    expect(thanh?.meaning).not.toContain('vệ sinh');

    // Chữ Khiết đơn lẻ
    const khiet = lookupKanji('潔', 'KHIẾT', 'sạch sẽ, vệ sinh');
    expect(khiet).not.toBeNull();
    expect(khiet?.character).toBe('潔');
    expect(khiet?.sinoVietnamese).toBe('KHIẾT');
    expect(khiet?.meaning).toContain('tinh khiết');
  });

  it('tra cứu chữ Hán bất kỳ trong từ điển toàn diện 10,383 mục', () => {
    // Chữ Hán bất kỳ không nằm trong danh sách 50 từ mẫu
    const detail = lookupKanji('龍');
    expect(detail).not.toBeNull();
    expect(detail?.character).toBe('龍');
    expect(detail?.sinoVietnamese).toContain('LONG');
    expect(detail?.meaning).toBe('con rồng');
  });

  it('fallback an toàn với âm Hán Việt ngữ cảnh khi chữ Hán siêu hiếm chưa có trong DB', () => {
    const detail = lookupKanji('𠮷', 'CÁT', 'chữ cát cổ');
    expect(detail).not.toBeNull();
    expect(detail?.character).toBe('𠮷');
    expect(detail?.sinoVietnamese).toBe('CÁT');
  });

  it('trả về null khi không tìm thấy và không có fallback', () => {
    expect(lookupKanji('')).toBeNull();
    expect(lookupKanji('𠮷')).toBeNull();
  });
});
