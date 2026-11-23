const COMMA = ',';
const SEMICOLON = ';';
const TAB = '\t';

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

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
