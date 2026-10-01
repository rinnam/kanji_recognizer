import { useState, type ReactElement } from 'react';
import { Button, Field, Input } from '../../../shared/ui';
import type { JlptLevel } from '../../../shared/api';
import type { QuickAddInput, QuickAddResult } from '../model/useVocabulary';

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface QuickAddFormProps {
  folderId: string | null;
  onAdd: (input: QuickAddInput) => Promise<QuickAddResult>;
}

type FormMessage = { kind: 'error' | 'success'; text: string };

/** Thêm nhanh một từ (chống trùng word+reading ở tầng model). */
export function QuickAddForm({ folderId, onAdd }: QuickAddFormProps): ReactElement {
  const [word, setWord] = useState('');
  const [reading, setReading] = useState('');
  const [meaning, setMeaning] = useState('');
  const [jlpt, setJlpt] = useState<JlptLevel | ''>('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<FormMessage | null>(null);

  const reset = (): void => {
    setWord('');
    setReading('');
    setMeaning('');
    setJlpt('');
    setNote('');
  };

  const submit = async (): Promise<void> => {
    const result = await onAdd({
      word,
      meaning,
      reading: reading.trim() === '' ? null : reading,
      jlptLevel: jlpt === '' ? null : jlpt,
      note: note.trim() === '' ? null : note,
      folderId,
    });
    if (result.ok) {
      reset();
      setMessage({ kind: 'success', text: `Đã thêm "${result.vocabulary.word}".` });
    } else {
      setMessage({ kind: 'error', text: result.message });
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
        <Field id="qa-word" label="Từ *">
          <Input id="qa-word" value={word} onChange={(event) => setWord(event.target.value)} />
        </Field>
        <Field id="qa-reading" label="Cách đọc">
          <Input
            id="qa-reading"
            value={reading}
            onChange={(event) => setReading(event.target.value)}
          />
        </Field>
        <Field id="qa-meaning" label="Nghĩa *">
          <Input
            id="qa-meaning"
            value={meaning}
            onChange={(event) => setMeaning(event.target.value)}
          />
        </Field>
        <Field id="qa-jlpt" label="JLPT">
          <select
            id="qa-jlpt"
            className="kn-ui-input"
            value={jlpt}
            onChange={(event) => setJlpt(event.target.value as JlptLevel | '')}
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
          <Input id="qa-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
      <div className="kn-qadd__actions">
        <Button type="submit" variant="primary" disabled={disabled}>
          Thêm từ
        </Button>
        {message !== null ? (
          <span
            className={
              message.kind === 'error' ? 'kn-qadd__msg kn-qadd__msg--error' : 'kn-qadd__msg'
            }
            role={message.kind === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}
