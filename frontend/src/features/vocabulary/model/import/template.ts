/** Tạo file mẫu CSV / Markdown để người dùng tải về rồi điền. */

/** Tiêu đề mẫu (đúng thứ tự cột theo mẫu). */
export const TEMPLATE_HEADERS = [
  'Từ',
  'Cách đọc',
  'Âm Hán Việt',
  'Nghĩa',
  'Câu ví dụ',
  'Dịch câu ví dụ',
  'JLPT',
  'Ghi chú',
];

const EXAMPLE_ROWS: string[][] = [
  ['水', 'みず', 'THỦY', 'nước', '水を飲む', 'uống nước', 'N5', 'ví dụ'],
  ['勉強', 'べんきょう', 'MIỄN CƯỠNG', 'học tập', '日本語を勉強する', 'học tiếng Nhật', 'N5', ''],
];

const BOM = '\uFEFF';

function csvCell(value: string): string {
  return /["\r\n,]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV mẫu: có BOM UTF-8 + tiêu đề + 2 dòng ví dụ, phân tách CRLF (hợp Excel). */
export function buildTemplateCsv(): string {
  const lines = [TEMPLATE_HEADERS, ...EXAMPLE_ROWS].map((row) => row.map(csvCell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

/** Markdown mẫu: bảng pipe (tiêu đề + dòng ngăn + 2 dòng ví dụ). */
export function buildTemplateMarkdown(): string {
  const header = `| ${TEMPLATE_HEADERS.join(' | ')} |`;
  const separator = `| ${TEMPLATE_HEADERS.map(() => '---').join(' | ')} |`;
  const body = EXAMPLE_ROWS.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return `${header}\n${separator}\n${body}\n`;
}
