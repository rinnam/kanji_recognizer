import { useMemo, useState, type ChangeEvent, type ReactElement } from 'react';
import { folderOptions, type LocalFolder } from '../../../entities/folder';
import { Button, Field, Modal } from '../../../shared/ui';
import {
  buildTemplateCsv,
  buildTemplateMarkdown,
  byteLength,
  clampRows,
  defaultMappingByPosition,
  detectHeaderMapping,
  hasReplacementChar,
  mapRowsToRecords,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  buildPreview,
  parseCsv,
  parseMarkdownTable,
  type ColumnTarget,
  type NormalizedImport,
  type PreviewRow,
} from '../model/import';
import './import.css';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  folders: LocalFolder[];
  defaultFolderId: string | null;
  existingKeys: ReadonlySet<string>;
  onImport: (records: NormalizedImport[], folderId: string | null) => Promise<number>;
}

type Step = 'source' | 'preview' | 'result';
type FileStatus = 'idle' | 'reading' | 'error';

interface ImportResult {
  added: number;
  duplicate: number;
  error: number;
  errors: PreviewRow[];
}

const PREVIEW_LIMIT = 50;

const TARGET_OPTIONS: ColumnTarget[] = [
  'skip',
  'word',
  'reading',
  'sinoVietnamese',
  'meaning',
  'example',
  'exampleMeaning',
  'jlpt',
  'note',
];

const TARGET_LABELS: Record<ColumnTarget, string> = {
  skip: '— Bỏ qua —',
  word: 'Từ',
  reading: 'Cách đọc',
  sinoVietnamese: 'Âm Hán Việt',
  meaning: 'Nghĩa',
  example: 'Câu ví dụ',
  exampleMeaning: 'Dịch câu ví dụ',
  jlpt: 'JLPT',
  note: 'Ghi chú',
};

const STATUS_LABEL: Record<PreviewRow['status'], string> = {
  new: 'Mới',
  duplicate: 'Trùng',
  error: 'Lỗi',
};

/** Markdown khi có dòng ngăn kiểu `|---|` (khớp heuristic của parseMarkdownTable). */
function looksLikeMarkdown(text: string): boolean {
  return text.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    return trimmed.includes('|') && trimmed.includes('-') && /^\|?[\s:|-]+\|?$/.test(trimmed);
  });
}

/** Tải chuỗi về máy dưới dạng file (Blob + <a download>) — KHÔNG gọi server. */
function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Nhập từ vựng theo 3 bước (THUẦN UI, lõi parse/validate/assemble nằm ở model):
 *  1) Nguồn: dán văn bản hoặc chọn file (CSV/TSV/MD/Quizlet) + tải mẫu CSV/Markdown.
 *  2) Cột & xem trước: ánh xạ cột, chọn thư mục đích, xem Mới/Trùng/Lỗi (50 dòng đầu) +
 *     tổng kết tính trên TẤT CẢ dòng.
 *  3) Kết quả: số đã thêm / bỏ qua (trùng) / lỗi + danh sách dòng lỗi.
 * Chỉ GHI các dòng Mới (một transaction) qua `onImport`.
 */
export function ImportModal({
  open,
  onClose,
  folders,
  defaultFolderId,
  existingKeys,
  onImport,
}: ImportModalProps): ReactElement {
  const [step, setStep] = useState<Step>('source');
  const [rawText, setRawText] = useState('');
  const [fileStatus, setFileStatus] = useState<FileStatus>('idle');
  const [parseError, setParseError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnTarget[]>([]);
  const [hasHeader, setHasHeader] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [notUtf8, setNotUtf8] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(defaultFolderId);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  // Thư mục đích: nhãn là đường dẫn đầy đủ, thứ tự DFS (cha ngay trước con) — bỏ danh sách phẳng cũ.
  const folderChoices = useMemo(() => folderOptions(folders), [folders]);

  // "Nhập tiếp": xóa trạng thái, quay về bước Nguồn. Hộp thoại được MOUNT MỚI mỗi lần mở
  // (parent render có điều kiện) nên KHÔNG cần effect đồng bộ — tránh gọi setState trong
  // effect gây cascading render.
  const resetToSource = (): void => {
    setStep('source');
    setRawText('');
    setFileStatus('idle');
    setParseError(null);
    setColumns([]);
    setMapping([]);
    setHasHeader(false);
    setTruncated(false);
    setNotUtf8(false);
    setTargetFolderId(defaultFolderId);
    setResult(null);
  };

  const colCount = useMemo(
    () => columns.reduce((max, row) => Math.max(max, row.length), 0),
    [columns],
  );

  const { previewRows, summary } = useMemo(() => {
    const parsed = mapRowsToRecords(columns, mapping, hasHeader);
    const built = buildPreview(parsed, existingKeys);
    return { previewRows: built.rows, summary: built.summary };
  }, [columns, mapping, hasHeader, existingKeys]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    setFileStatus('reading');
    const reader = new FileReader();
    reader.onload = (): void => {
      setRawText(typeof reader.result === 'string' ? reader.result : '');
      setFileStatus('idle');
    };
    reader.onerror = (): void => setFileStatus('error');
    reader.readAsText(file);
  };

  const handleContinue = (): void => {
    setParseError(null);
    if (byteLength(rawText) > MAX_IMPORT_BYTES) {
      setParseError('Nội dung quá lớn (giới hạn 2 MB).');
      return;
    }
    const rawRows = looksLikeMarkdown(rawText) ? parseMarkdownTable(rawText) : parseCsv(rawText);
    const { rows: limited, truncated: wasTruncated } = clampRows(rawRows);
    const detected = limited.length > 0 ? detectHeaderMapping(limited[0]) : null;
    const columnCount = limited.length > 0 ? limited[0].length : 0;
    setColumns(limited);
    setHasHeader(detected !== null);
    setMapping(detected ?? defaultMappingByPosition(columnCount));
    setTruncated(wasTruncated);
    setNotUtf8(hasReplacementChar(rawText));
    setStep('preview');
  };

  const changeMapping = (index: number, target: ColumnTarget): void => {
    setMapping((prev) => {
      const next = [...prev];
      while (next.length < colCount) next.push('skip');
      next[index] = target;
      return next;
    });
  };

  const handleImport = async (): Promise<void> => {
    const newRecords = previewRows
      .filter((row) => row.status === 'new')
      .map((row) => row.record);
    setImporting(true);
    try {
      const added = await onImport(newRecords, targetFolderId);
      setResult({
        added,
        duplicate: summary.duplicate,
        error: summary.error,
        errors: previewRows.filter((row) => row.status === 'error'),
      });
      setStep('result');
    } finally {
      setImporting(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'source', label: 'Nguồn' },
    { key: 'preview', label: 'Cột & xem trước' },
    { key: 'result', label: 'Kết quả' },
  ];

  // Thanh bước nằm trong HEADER cố định của Modal (không cuộn theo thân).
  const stepBar = (
    <ol className="kn-import__steps">
      {steps.map((item, index) => (
        <li key={item.key} className={`kn-import__step${item.key === step ? ' is-active' : ''}`}>
          <span className="kn-import__step-num">{index + 1}</span>
          {item.label}
        </li>
      ))}
    </ol>
  );

  const footer =
    step === 'source' ? (
      <>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="primary"
          disabled={rawText.trim() === '' || fileStatus === 'reading'}
          onClick={handleContinue}
        >
          Tiếp tục
        </Button>
      </>
    ) : step === 'preview' ? (
      <>
        <Button onClick={() => setStep('source')}>Quay lại</Button>
        <Button
          variant="primary"
          disabled={summary.new === 0 || importing}
          onClick={() => void handleImport()}
        >
          {importing ? 'Đang nhập…' : `Nhập ${summary.new} từ`}
        </Button>
      </>
    ) : (
      <>
        <Button onClick={resetToSource}>Nhập tiếp</Button>
        <Button variant="primary" onClick={onClose}>
          Đóng
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      size="lg"
      title="Nhập từ vựng từ file / dán"
      onClose={onClose}
      headerExtra={stepBar}
      footer={footer}
    >
      <div className="kn-import">
        {step === 'source' ? (
          <>
            <Field id="kn-import-text" label="Dán dữ liệu (CSV, TSV, Markdown hoặc copy từ Quizlet)">
              <textarea
                id="kn-import-text"
                className="kn-import__textarea"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                placeholder={'水\tnước\n勉強\thọc tập'}
              />
            </Field>
            <div className="kn-import__row">
              <input
                type="file"
                accept=".csv,.tsv,.txt,.md,text/plain"
                aria-label="Chọn file để nhập"
                onChange={handleFile}
              />
              {fileStatus === 'reading' ? (
                <span className="kn-import__hint">Đang đọc file…</span>
              ) : null}
              {fileStatus === 'error' ? (
                <span className="kn-import__warn">Không đọc được file. Hãy thử lại.</span>
              ) : null}
            </div>
            <div className="kn-import__row">
              <span className="kn-import__hint">Chưa có dữ liệu? Tải mẫu rồi điền:</span>
              <Button
                onClick={() =>
                  downloadText('kanji-nest-mau.csv', buildTemplateCsv(), 'text/csv;charset=utf-8')
                }
              >
                Tải mẫu CSV
              </Button>
              <Button
                onClick={() =>
                  downloadText(
                    'kanji-nest-mau.md',
                    buildTemplateMarkdown(),
                    'text/markdown;charset=utf-8',
                  )
                }
              >
                Tải mẫu Markdown
              </Button>
            </div>
            {parseError !== null ? <p className="kn-import__warn">{parseError}</p> : null}
          </>
        ) : null}

        {step === 'preview' ? (
          columns.length === 0 ? (
            <p className="kn-import__hint">Không có dòng dữ liệu nào để nhập.</p>
          ) : (
            <>
              <div className="kn-import__mapping">
                {Array.from({ length: colCount }, (_, ci) => (
                  <div key={ci} className="kn-import__map-cell">
                    <span className="kn-import__map-head" title={hasHeader ? columns[0][ci] : ''}>
                      {hasHeader && columns[0][ci] ? columns[0][ci] : `Cột ${ci + 1}`}
                    </span>
                    <select
                      className="kn-import__select"
                      aria-label={`Ánh xạ cột ${ci + 1}`}
                      value={mapping[ci] ?? 'skip'}
                      onChange={(event) => changeMapping(ci, event.target.value as ColumnTarget)}
                    >
                      {TARGET_OPTIONS.map((target) => (
                        <option key={target} value={target}>
                          {TARGET_LABELS[target]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="kn-import__row">
                <label className="kn-import__hint">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(event) => setHasHeader(event.target.checked)}
                  />{' '}
                  Dòng đầu là tiêu đề
                </label>
                <span className="kn-import__spacer" />
                <Field id="kn-import-folder" label="Thư mục đích">
                  <select
                    id="kn-import-folder"
                    className="kn-import__select"
                    value={targetFolderId ?? ''}
                    onChange={(event) =>
                      setTargetFolderId(event.target.value === '' ? null : event.target.value)
                    }
                  >
                    <option value="">Tất cả từ vựng (không gán thư mục)</option>
                    {folderChoices.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <p className="kn-import__summary">
                {summary.total} dòng: <b>{summary.new}</b> mới · {summary.duplicate} trùng ·{' '}
                {summary.error} lỗi
              </p>
              {truncated ? (
                <p className="kn-import__warn">
                  Đã cắt còn {MAX_IMPORT_ROWS} dòng đầu (vượt giới hạn nhập).
                </p>
              ) : null}
              {notUtf8 ? (
                <p className="kn-import__warn">
                  Có ký tự lạ — file có thể không phải UTF-8. Hãy lưu lại dạng UTF-8.
                </p>
              ) : null}

              <div className="kn-import__table-wrap">
                <table className="kn-import__table">
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Trạng thái</th>
                      <th>Từ</th>
                      <th>Nghĩa</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, PREVIEW_LIMIT).map((row) => (
                      <tr key={row.line}>
                        <td>{row.line}</td>
                        <td>
                          <span className={`kn-import__badge kn-import__badge--${row.status}`}>
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                        <td>{row.record.word}</td>
                        <td>{row.record.meaning}</td>
                        <td>
                          {row.reason !== undefined ? (
                            <span className="kn-import__reason">{row.reason}</span>
                          ) : null}
                          {row.warnings.map((warning) => (
                            <span key={warning} className="kn-import__reason">
                              {warning}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > PREVIEW_LIMIT ? (
                <p className="kn-import__hint">
                  Hiển thị {PREVIEW_LIMIT}/{previewRows.length} dòng đầu.
                </p>
              ) : null}
            </>
          )
        ) : null}

        {step === 'result' && result !== null ? (
          <>
            <p className="kn-import__result-head">
              Đã thêm {result.added} · Bỏ qua (trùng) {result.duplicate} · Lỗi {result.error}
            </p>
            {result.errors.length > 0 ? (
              <ul className="kn-import__errors">
                {result.errors.map((row) => (
                  <li key={row.line}>
                    Dòng {row.line}: {row.reason ?? 'Lỗi'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="kn-import__hint">Không có dòng lỗi.</p>
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
