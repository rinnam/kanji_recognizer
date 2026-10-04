import type { JlptLevel } from '../../../../shared/api';
import type { LocalFolder } from '../../../../entities/folder';
import type { LocalVocabulary } from '../../../../entities/vocabulary';
import { classifyIncoming } from '../branch-dedupe';
import { dedupeKey } from '../dedupe';
import { trimToNull } from '../normalize';
import type { ImportSummary, NormalizedImport, ParsedRow, PreviewRow } from './types';

/** Giới hạn an toàn khi nhập. */
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** Độ dài byte UTF-8 (THUẦN, không DOM). */
export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Văn bản chứa ký tự thay thế U+FFFD -> nhiều khả năng không phải UTF-8. */
export function hasReplacementChar(text: string): boolean {
  return text.includes('\uFFFD');
}

/** Cắt bớt theo giới hạn dòng; `truncated` = true nếu vượt. */
export function clampRows<T>(rows: readonly T[]): { rows: T[]; truncated: boolean } {
  if (rows.length <= MAX_IMPORT_ROWS) return { rows: [...rows], truncated: false };
  return { rows: rows.slice(0, MAX_IMPORT_ROWS), truncated: true };
}

/**
 * Chuẩn hóa JLPT: bỏ khoảng trắng + IN HOA; chấp nhận N1..N5 (kể cả "n 3" -> N3).
 * Rỗng -> null (không cảnh báo). Sai -> null + `invalid` = true (cảnh báo, KHÔNG phải lỗi).
 */
export function normalizeJlpt(raw: string): { value: JlptLevel | null; invalid: boolean } {
  const text = raw.replace(/\s+/g, '').toUpperCase();
  if (text === '') return { value: null, invalid: false };
  if (/^N[1-5]$/.test(text)) return { value: text as JlptLevel, invalid: false };
  return { value: null, invalid: true };
}

/** Bối cảnh phân loại (THUẦN): kho từ còn sống + cây thư mục + thư mục đích đang chọn. */
export interface PreviewContext {
  vocabs: LocalVocabulary[];
  folders: LocalFolder[];
  targetFolderId: string | null;
}

/**
 * Dựng bảng xem trước (THUẦN): mỗi dòng -> Mới / Gắn vào thư mục / Trùng (bỏ qua) / Lỗi.
 * - Thiếu Từ hoặc Nghĩa = LỖI (kèm lý do).
 * - Phân loại trùng THEO NHÁNH của thư mục đích (classifyIncoming — 7B): đã có trong nhánh →
 *   Trùng (bỏ qua); đã có ở nhánh khác / chưa gán thư mục → Gắn vào thư mục; trùng dòng trước
 *   trong file → Trùng (in-file); chưa chọn thư mục mà từ đã có → Trùng (exists).
 * - JLPT sai -> cảnh báo (không chặn), cấp độ để null.
 */
export function buildPreview(
  rows: readonly ParsedRow[],
  context: PreviewContext,
): { rows: PreviewRow[]; summary: ImportSummary } {
  const { vocabs, folders, targetFolderId } = context;
  const seenKeys = new Set<string>();
  const previews: PreviewRow[] = [];
  let fresh = 0;
  let link = 0;
  let duplicate = 0;
  let error = 0;

  for (const raw of rows) {
    const word = raw.word.trim();
    const meaning = raw.meaning.trim();
    const reading = trimToNull(raw.reading);
    const jlpt = normalizeJlpt(raw.jlpt);
    const warnings: string[] = [];
    if (jlpt.invalid) warnings.push(`JLPT không hợp lệ "${raw.jlpt.trim()}" → bỏ qua cấp độ.`);

    const record: NormalizedImport = {
      word,
      reading,
      sinoVietnamese: trimToNull(raw.sinoVietnamese),
      meaning,
      example: trimToNull(raw.example),
      exampleMeaning: trimToNull(raw.exampleMeaning),
      jlptLevel: jlpt.value,
      note: trimToNull(raw.note),
    };

    if (word === '' || meaning === '') {
      const reason =
        word === '' && meaning === ''
          ? 'Thiếu Từ và Nghĩa'
          : word === ''
            ? 'Thiếu Từ'
            : 'Thiếu Nghĩa';
      previews.push({ line: raw.line, status: 'error', reason, warnings, record });
      error += 1;
      continue;
    }

    const result = classifyIncoming({
      incoming: { word, reading },
      targetFolderId,
      vocabs,
      folders,
      seenKeys,
    });
    seenKeys.add(dedupeKey(word, reading));

    if (result.kind === 'new') {
      previews.push({ line: raw.line, status: 'new', warnings, record });
      fresh += 1;
    } else if (result.kind === 'link') {
      previews.push({
        line: raw.line,
        status: 'link',
        warnings,
        record,
        existingId: result.existingId,
        existingPath: result.existingPath,
      });
      link += 1;
    } else if (result.reason === 'in-file') {
      previews.push({ line: raw.line, status: 'duplicate', warnings, record, dupReason: 'in-file' });
      duplicate += 1;
    } else {
      previews.push({
        line: raw.line,
        status: 'duplicate',
        warnings,
        record,
        dupReason: result.reason,
        existingPath: result.existingPath,
      });
      duplicate += 1;
    }
  }

  return {
    rows: previews,
    summary: { total: previews.length, new: fresh, link, duplicate, error },
  };
}
