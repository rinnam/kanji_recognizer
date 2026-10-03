import type { JlptLevel } from '../../../../shared/api';

/** Đích ánh xạ cho một cột khi nhập (hoặc bỏ qua). */
export type ColumnTarget =
  | 'skip'
  | 'word'
  | 'reading'
  | 'sinoVietnamese'
  | 'meaning'
  | 'example'
  | 'exampleMeaning'
  | 'jlpt'
  | 'note';

/** Một dòng dữ liệu thô sau khi ánh xạ cột (mọi trường là chuỗi; `line` = số dòng gốc 1-based). */
export interface ParsedRow {
  line: number;
  word: string;
  reading: string;
  sinoVietnamese: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
  jlpt: string;
  note: string;
}

/** Bản ghi đã chuẩn hóa, sẵn sàng ghi vào IndexedDB (trường rỗng -> null). */
export interface NormalizedImport {
  word: string;
  reading: string | null;
  sinoVietnamese: string | null;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
  jlptLevel: JlptLevel | null;
  note: string | null;
}

export type RowStatus = 'new' | 'duplicate' | 'error';

/** Một dòng trong bảng xem trước nhập. */
export interface PreviewRow {
  line: number;
  status: RowStatus;
  /** Lý do lỗi (chỉ khi status = 'error'). */
  reason?: string;
  /** Cảnh báo không chặn (ví dụ JLPT sai -> bỏ qua cấp độ). */
  warnings: string[];
  record: NormalizedImport;
}

/** Tổng kết toàn bộ dòng (tính trên TẤT CẢ dòng, không chỉ 50 dòng xem trước). */
export interface ImportSummary {
  total: number;
  new: number;
  duplicate: number;
  error: number;
}
