import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { Button, Field, Input } from '../../../shared/ui';
import type { JlptLevel } from '../../../shared/api';
import { normalizeQuickAdd } from '../model/normalize';
import type { QuickAddInput, QuickAddResult } from '../model/useVocabulary';

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface QuickAddFormProps {
  folderId: string | null;
  onAdd: (input: QuickAddInput) => Promise<QuickAddResult>;
}

type FormMessage = { kind: 'error' | 'success'; text: string };

/** True khi đang gõ dở bằng IME (Enter lúc này KHÔNG được submit). */
function isComposing(event: KeyboardEvent): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

/**
 * Thêm nhanh một từ với ĐỦ trường (word/reading/sinoVietnamese/meaning/example/
 * exampleMeaning/jlpt/note). Chuẩn hóa (trim, rỗng -> null) ở hàm thuần `normalizeQuickAdd`;
 * chống trùng word+reading ở tầng model. Thêm xong: xóa ô chữ, GIỮ JLPT, focus lại ô Từ.
 */
export function QuickAddForm({ folderId, onAdd }: QuickAddFormProps): ReactElement {
  const [word, setWord] = useState('');
  const [reading, setReading] = useState('');
  const [sino, setSino] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [exampleMeaning, setExampleMeaning] = useState('');
  const [jlpt, setJlpt] = useState<JlptLevel | ''>('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<FormMessage | null>(null);

  // Xóa các ô CHỮ nhưng GIỮ lựa chọn JLPT để nhập liên tục cùng cấp độ.
  const clearText = (): void => {
    setWord('');
    setReading('');
    setSino('');
    setMeaning('');
    setExample('');
    setExampleMeaning('');
    setNote('');
  };

  const submit = async (): Promise<void> => {
    const normalized = normalizeQuickAdd({
      word,
      reading,
      sinoVietnamese: sino,
      meaning,
      example,
      exampleMeaning,
      jlptLevel: jlpt === '' ? null : jlpt,
      note,
    });
    if (normalized.word === '' || normalized.meaning === '') {
      setMessage({ kind: 'error', text: 'Cần nhập ít nhất Từ và Nghĩa.' });
      return;
    }
    const result = await onAdd({ ...normalized, folderId });
    if (result.ok) {
      clearText();
      setMessage({ kind: 'success', text: `Đã thêm "${result.vocabulary.word}".` });
      (document.getElementById('qa-word') as HTMLInputElement | null)?.focus();
    } else {
      setMessage({ kind: 'error', text: result.message });
    }
  };

  // Ô MỘT dòng: Enter → submit qua onSubmit của form; chặn submit khi đang gõ IME.
  const onLineKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>): void => {
    if (event.key === 'Enter' && isComposing(event)) {
      event.preventDefault();
    }
  };
  // Textarea: Ctrl/Cmd+Enter → submit; Enter thường = xuống dòng; đang gõ IME → bỏ qua.
  const onAreaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !isComposing(event)) {
      event.preventDefault();
      void submit();
    }
  };

  const disabled = word.trim() === '' || meaning.trim() === '';

  return (
    <form
      className="kn-qadd"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="kn-qadd__row">
        <Field id="qa-word" label="Từ vựng *">
          <Input
            id="qa-word"
            value={word}
            onChange={(event) => setWord(event.target.value)}
            onKeyDown={onLineKeyDown}
          />
        </Field>
        <Field id="qa-reading" label="Cách đọc">
          <Input
            id="qa-reading"
            value={reading}
            onChange={(event) => setReading(event.target.value)}
            onKeyDown={onLineKeyDown}
          />
        </Field>
        <Field id="qa-sino" label="Âm Hán Việt">
          <Input
            id="qa-sino"
            className="kn-qadd__sino"
            value={sino}
            onChange={(event) => setSino(event.target.value)}
            onKeyDown={onLineKeyDown}
          />
        </Field>
        <Field id="qa-meaning" label="Nghĩa tiếng Việt *">
          <Input
            id="qa-meaning"
            value={meaning}
            onChange={(event) => setMeaning(event.target.value)}
            onKeyDown={onLineKeyDown}
          />
        </Field>
      </div>

      <div className="kn-qadd__row kn-qadd__row--areas">
        <Field id="qa-example" label="Câu ví dụ">
          <textarea
            id="qa-example"
            className="kn-ui-input kn-qadd__ta"
            rows={2}
            value={example}
            onChange={(event) => setExample(event.target.value)}
            onKeyDown={onAreaKeyDown}
          />
        </Field>
        <Field id="qa-example-meaning" label="Dịch câu ví dụ">
          <textarea
            id="qa-example-meaning"
            className="kn-ui-input kn-qadd__ta"
            rows={2}
            value={exampleMeaning}
            onChange={(event) => setExampleMeaning(event.target.value)}
            onKeyDown={onAreaKeyDown}
          />
        </Field>
      </div>

      <div className="kn-qadd__row kn-qadd__row--last">
        <Field id="qa-jlpt" label="JLPT">
          <select
            id="qa-jlpt"
            className="kn-ui-input"
            value={jlpt}
            onChange={(event) => setJlpt(event.target.value as JlptLevel | '')}
            onKeyDown={onLineKeyDown}
          >
            <option value="">—</option>
            {JLPT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
        <Field id="qa-note" label="Ghi chú">
          <Input
            id="qa-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={onLineKeyDown}
          />
        </Field>
        <div className="kn-qadd__submit">
          <Button type="submit" variant="primary" disabled={disabled}>
            Thêm từ
          </Button>
        </div>
      </div>

      {message !== null ? (
        <p
          className={
            message.kind === 'error' ? 'kn-qadd__msg kn-qadd__msg--error' : 'kn-qadd__msg'
          }
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
