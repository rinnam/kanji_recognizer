/**
 * Các hàm PARSE THUẦN (không DOM/DB) cho nhập từ vựng:
 * - parseCsv: đúng RFC 4180 (ô trong dấu nháy, "" là một dấu nháy, xuống dòng trong ô, CRLF),
 *   tự bỏ BOM, tự dò dấu phân cách (, ; Tab) ở dòng đầu.
 * - parseDelimited: tách đơn giản theo dấu cột/dòng (cho ô dán kiểu Quizlet).
 * - parseMarkdownTable: bảng pipe, bỏ dòng ngăn |---|.
 * Tất cả trả về mảng dòng × ô (string[][]).
 */

const COMMA = ',';
const SEMICOLON = ';';
const TAB = '\t';

/** Bỏ BOM UTF-8 ở đầu chuỗi nếu có. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Dò dấu phân cách ở dòng đầu: đếm (ngoài dấu nháy) `, ; Tab`, chọn cái nhiều nhất; mặc định phẩy. */
export function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = { [COMMA]: 0, [SEMICOLON]: 0, [TAB]: 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === COMMA || ch === SEMICOLON || ch === TAB)) counts[ch] += 1;
  }
  let best = COMMA;
  let bestCount = 0;
  for (const sep of [COMMA, SEMICOLON, TAB]) {
    if (counts[sep] > bestCount) {
      best = sep;
      bestCount = counts[sep];
    }
  }
  return best;
}

/** Parse CSV đúng RFC 4180. `delimiter` để trống thì tự dò ở dòng đầu. */
export function parseCsv(input: string, delimiter?: string): string[][] {
  const text = stripBom(input);
  const newlineIdx = text.indexOf('\n');
  const firstLine = newlineIdx === -1 ? text : text.slice(0, newlineIdx);
  const sep = delimiter ?? detectDelimiter(firstLine);

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === sep) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i += text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  rows.push(row);

  // Bỏ dòng rỗng cuối cùng do file kết thúc bằng xuống dòng.
  const last = rows[rows.length - 1];
  if (last.length === 1 && last[0] === '') rows.pop();
  return rows;
}

export interface DelimitedOptions {
  colSep: string;
  rowSep: string;
}

/** Tách đơn giản (KHÔNG xử lý dấu nháy) cho ô dán: mặc định cột = Tab, dòng = xuống dòng. */
export function parseDelimited(input: string, options: DelimitedOptions): string[][] {
  const text = stripBom(input).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split(options.rowSep);
  return lines
    .map((line) => line.split(options.colSep))
    .filter((cells) => !(cells.length === 1 && cells[0].trim() === ''));
}

/** Parse bảng Markdown (pipe). Bỏ dòng ngăn |---| và dòng rỗng; trim từng ô. */
export function parseMarkdownTable(input: string): string[][] {
  const text = stripBom(input).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || !line.includes('|')) continue;
    if (line.includes('-') && /^\|?[\s:|-]+\|?$/.test(line)) continue; // dòng ngăn |---|
    let inner = line;
    if (inner.startsWith('|')) inner = inner.slice(1);
    if (inner.endsWith('|')) inner = inner.slice(0, -1);
    out.push(inner.split('|').map((cell) => cell.trim()));
  }
  return out;
}
