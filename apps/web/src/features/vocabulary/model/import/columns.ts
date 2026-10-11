import type { ColumnTarget, ParsedRow } from './types';

/**
 * Ánh xạ cột khi nhập: dò theo bí danh tiêu đề (không phân biệt hoa/thường và dấu),
 * hoặc mặc định theo vị trí khi không có tiêu đề.
 */

/** Chuẩn hóa tiêu đề để so khớp: thường hóa + bỏ dấu + đ->d + gộp khoảng trắng. */
export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: { target: ColumnTarget; keys: string[] }[] = [
  { target: 'word', keys: ['tu', 'tu vung', 'word', 'kanji'] },
  { target: 'reading', keys: ['cach doc', 'reading', 'kana', 'furigana'] },
  { target: 'sinoVietnamese', keys: ['am han viet', 'han viet', 'sinovietnamese'] },
  { target: 'meaning', keys: ['nghia', 'nghia tieng viet', 'meaning'] },
  { target: 'example', keys: ['cau vi du', 'vi du', 'example'] },
  { target: 'exampleMeaning', keys: ['dich cau vi du', 'dich vi du', 'examplemeaning'] },
  { target: 'jlpt', keys: ['jlpt', 'level', 'cap do'] },
  { target: 'note', keys: ['ghi chu', 'note', 'notes'] },
];

/** Thứ tự cột theo mẫu (dùng cho mặc định theo vị trí khi >= 3 cột). */
export const TEMPLATE_ORDER: ColumnTarget[] = [
  'word',
  'reading',
  'sinoVietnamese',
  'meaning',
  'example',
  'exampleMeaning',
  'jlpt',
  'note',
];

/** Một ô tiêu đề -> đích (hoặc 'skip' nếu không khớp bí danh nào). */
export function headerToTarget(cell: string): ColumnTarget {
  const key = normalizeHeader(cell);
  for (const alias of ALIASES) {
    if (alias.keys.includes(key)) return alias.target;
  }
  return 'skip';
}

/**
 * Dò ánh xạ từ dòng đầu nếu nó là tiêu đề: trả mảng đích theo cột, hoặc null nếu KHÔNG
 * ô nào khớp bí danh (coi như không có tiêu đề).
 */
export function detectHeaderMapping(headerCells: string[]): ColumnTarget[] | null {
  const mapping = headerCells.map(headerToTarget);
  return mapping.some((target) => target !== 'skip') ? mapping : null;
}

/** Mặc định theo vị trí: 2 cột = [Từ, Nghĩa] (kiểu Quizlet); >= 3 cột theo thứ tự mẫu. */
export function defaultMappingByPosition(colCount: number): ColumnTarget[] {
  if (colCount <= 0) return [];
  if (colCount === 2) return ['word', 'meaning'];
  const mapping: ColumnTarget[] = [];
  for (let i = 0; i < colCount; i += 1) mapping.push(TEMPLATE_ORDER[i] ?? 'skip');
  return mapping;
}

/**
 * Ánh xạ mảng dòng×ô thành ParsedRow[]: bỏ qua dòng tiêu đề (nếu `hasHeader`), bỏ dòng rỗng,
 * đặt từng ô vào trường theo `mapping`. `line` = số dòng gốc 1-based (để báo lỗi đúng dòng).
 */
export function mapRowsToRecords(
  rows: string[][],
  mapping: ColumnTarget[],
  hasHeader: boolean,
): ParsedRow[] {
  const out: ParsedRow[] = [];
  rows.forEach((cells, idx) => {
    if (hasHeader && idx === 0) return;
    if (cells.every((cell) => cell.trim() === '')) return;
    const record: ParsedRow = {
      line: idx + 1,
      word: '',
      reading: '',
      sinoVietnamese: '',
      meaning: '',
      example: '',
      exampleMeaning: '',
      jlpt: '',
      note: '',
    };
    cells.forEach((cell, ci) => {
      const target = mapping[ci] ?? 'skip';
      if (target === 'skip') return;
      record[target] = cell;
    });
    out.push(record);
  });
  return out;
}
