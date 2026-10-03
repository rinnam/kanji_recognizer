import { describe, expect, it } from 'vitest';
import { dedupeKey } from '../../src/features/vocabulary/model/dedupe';
import {
  buildPreview,
  buildTemplateCsv,
  clampRows,
  defaultMappingByPosition,
  detectHeaderMapping,
  mapRowsToRecords,
  MAX_IMPORT_ROWS,
  normalizeJlpt,
  parseCsv,
  parseDelimited,
  parseMarkdownTable,
  TEMPLATE_HEADERS,
  type ColumnTarget,
  type ParsedRow,
} from '../../src/features/vocabulary/model/import';

function parsedRow(partial: Partial<ParsedRow> & { line: number }): ParsedRow {
  return {
    line: partial.line,
    word: partial.word ?? '',
    reading: partial.reading ?? '',
    sinoVietnamese: partial.sinoVietnamese ?? '',
    meaning: partial.meaning ?? '',
    example: partial.example ?? '',
    exampleMeaning: partial.exampleMeaning ?? '',
    jlpt: partial.jlpt ?? '',
    note: partial.note ?? '',
  };
}

describe('import/parseCsv (RFC 4180)', () => {
  it('ô trong dấu nháy có dấu phẩy / xuống dòng / "" + BOM + CRLF', () => {
    const csv = '\uFEFFword,reading,meaning\r\n"a,b","x\ny",c\r\n"he said ""hi""",r2,m2\r\n';
    expect(parseCsv(csv)).toEqual([
      ['word', 'reading', 'meaning'],
      ['a,b', 'x\ny', 'c'],
      ['he said "hi"', 'r2', 'm2'],
    ]);
  });

  it('tự dò dấu chấm phẩy ở dòng đầu', () => {
    expect(parseCsv('a;b;c\r\n1;2;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });
});

describe('import/parseDelimited (dán kiểu Quizlet)', () => {
  it('mặc định Tab giữa cột, xuống dòng giữa dòng', () => {
    expect(parseDelimited('a\tb\nc\td', { colSep: '\t', rowSep: '\n' })).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('tùy chọn cột = | và dòng = ;', () => {
    expect(parseDelimited('a|b;c|d', { colSep: '|', rowSep: ';' })).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('import/parseMarkdownTable', () => {
  it('bỏ dòng ngăn |---| và trim ô', () => {
    const md = '| Từ | Nghĩa |\n| --- | --- |\n| 水 | nước |';
    expect(parseMarkdownTable(md)).toEqual([
      ['Từ', 'Nghĩa'],
      ['水', 'nước'],
    ]);
  });
});

describe('import/columns', () => {
  it('dò tiêu đề theo bí danh (không phân biệt dấu)', () => {
    expect(detectHeaderMapping(['Từ', 'Cách đọc', 'Âm Hán Việt', 'Nghĩa'])).toEqual([
      'word',
      'reading',
      'sinoVietnamese',
      'meaning',
    ]);
  });

  it('không có tiêu đề (không ô nào khớp) -> null', () => {
    expect(detectHeaderMapping(['水', 'nước'])).toBeNull();
  });

  it('mặc định theo vị trí: 2 cột = [Từ, Nghĩa]; 4 cột theo thứ tự mẫu', () => {
    expect(defaultMappingByPosition(2)).toEqual(['word', 'meaning']);
    expect(defaultMappingByPosition(4)).toEqual(['word', 'reading', 'sinoVietnamese', 'meaning']);
  });

  it('mapRowsToRecords: bỏ tiêu đề + dòng rỗng, giữ số dòng gốc', () => {
    const rows = [
      ['Từ', 'Nghĩa'],
      ['水', 'nước'],
      ['', ''],
      ['火', 'lửa'],
    ];
    const mapping: ColumnTarget[] = ['word', 'meaning'];
    const recs = mapRowsToRecords(rows, mapping, true);
    expect(recs.map((r) => [r.line, r.word, r.meaning])).toEqual([
      [2, '水', 'nước'],
      [4, '火', 'lửa'],
    ]);
  });
});

describe('import/normalizeJlpt', () => {
  it('N1..N5 không phân biệt hoa/thường, kể cả "n 3"', () => {
    expect(normalizeJlpt('n 3')).toEqual({ value: 'N3', invalid: false });
    expect(normalizeJlpt('N5')).toEqual({ value: 'N5', invalid: false });
  });

  it('rỗng -> null (không cảnh báo); sai -> null + invalid', () => {
    expect(normalizeJlpt('')).toEqual({ value: null, invalid: false });
    expect(normalizeJlpt('abc')).toEqual({ value: null, invalid: true });
  });
});

describe('import/buildPreview', () => {
  it('phân loại Mới / Trùng (DB + trong file) / Lỗi + cảnh báo JLPT', () => {
    const parsed = [
      parsedRow({ line: 2, word: '水', reading: 'みず', meaning: 'nước', jlpt: 'N5' }),
      parsedRow({ line: 3, word: '水', reading: 'みず', meaning: 'trùng trong file' }),
      parsedRow({ line: 4, word: '', meaning: 'thiếu từ' }),
      parsedRow({ line: 5, word: '木', reading: 'き', meaning: 'cây', jlpt: 'xx' }),
      parsedRow({ line: 6, word: '火', reading: 'ひ', meaning: 'lửa' }),
    ];
    const existing = new Set([dedupeKey('火', 'ひ')]);
    const { rows, summary } = buildPreview(parsed, existing);

    expect(summary).toEqual({ total: 5, new: 2, duplicate: 2, error: 1 });
    const byLine = Object.fromEntries(rows.map((r) => [r.line, r]));
    expect(byLine[2].status).toBe('new');
    expect(byLine[3].status).toBe('duplicate');
    expect(byLine[4].status).toBe('error');
    expect(byLine[4].reason).toBe('Thiếu Từ');
    expect(byLine[5].status).toBe('new');
    expect(byLine[5].warnings).toHaveLength(1);
    expect(byLine[5].record.jlptLevel).toBeNull();
    expect(byLine[6].status).toBe('duplicate');
  });
});

describe('import/template + limits', () => {
  it('buildTemplateCsv có BOM + tiêu đề đúng, parse lại ra 3 dòng', () => {
    const tpl = buildTemplateCsv();
    expect(tpl.charCodeAt(0)).toBe(0xfeff);
    const rows = parseCsv(tpl);
    expect(rows[0]).toEqual(TEMPLATE_HEADERS);
    expect(rows).toHaveLength(3);
  });

  it('clampRows: cắt theo giới hạn dòng', () => {
    const many = Array.from({ length: MAX_IMPORT_ROWS + 10 }, (_, i) => i);
    const result = clampRows(many);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(MAX_IMPORT_ROWS);
    expect(clampRows([1, 2, 3]).truncated).toBe(false);
  });
});
