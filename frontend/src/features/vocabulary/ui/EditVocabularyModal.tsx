import { useEffect, useState, type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { JlptLevel } from '../../../shared/api';
import { Button, Field, Input, Modal } from '../../../shared/ui';
import { nowIso } from '../../../shared/lib';

export interface EditVocabularyModalProps {
  vocabulary: LocalVocabulary | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: LocalVocabulary) => Promise<void> | void;
}

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function EditVocabularyModal({
  vocabulary,
  open,
  onClose,
  onSave,
}: EditVocabularyModalProps): ReactElement {
  const [word, setWord] = useState('');
  const [reading, setReading] = useState('');
  const [sino, setSino] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [exampleMeaning, setExampleMeaning] = useState('');
  const [jlpt, setJlpt] = useState<JlptLevel | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vocabulary) {
      setWord(vocabulary.word);
      setReading(vocabulary.reading ?? '');
      setSino(vocabulary.sinoVietnamese ?? '');
      setMeaning(vocabulary.meaning);
      setExample(vocabulary.example ?? '');
      setExampleMeaning(vocabulary.exampleMeaning ?? '');
      setJlpt(vocabulary.jlptLevel ?? '');
      setNote(vocabulary.note ?? '');
      setError(null);
    }
  }, [vocabulary, open]);

  const handleSubmit = async (): Promise<void> => {
    if (!vocabulary) return;
    const trimmedWord = word.trim();
    const trimmedMeaning = meaning.trim();
    if (!trimmedWord || !trimmedMeaning) {
      setError('Vui lòng nhập Từ và Nghĩa.');
      return;
    }

    setSaving(true);
    try {
      const updated: LocalVocabulary = {
        ...vocabulary,
        word: trimmedWord,
        reading: reading.trim() || null,
        sinoVietnamese: sino.trim() || null,
        meaning: trimmedMeaning,
        example: example.trim() || null,
        exampleMeaning: exampleMeaning.trim() || null,
        jlptLevel: jlpt === '' ? null : jlpt,
        note: note.trim() || null,
        updatedAt: nowIso(),
      };
      await onSave(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu từ vựng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Chỉnh sửa từ vựng"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {error ? (
          <div
            role="alert"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: 'var(--kn-danger-bg, #fee2e2)',
              color: 'var(--kn-danger, #b91c1c)',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Từ vựng *" id="edit-word">
            <Input
              id="edit-word"
              value={word}
              onChange={(e) => {
                setWord(e.target.value);
                setError(null);
              }}
              required
            />
          </Field>
          <Field label="Cách đọc (Hiragana)" id="edit-reading">
            <Input
              id="edit-reading"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              placeholder="Ví dụ: だんせい"
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Âm Hán Việt" id="edit-sino">
            <Input
              id="edit-sino"
              value={sino}
              onChange={(e) => setSino(e.target.value)}
              placeholder="Ví dụ: NAM TÍNH"
            />
          </Field>
          <Field label="Cấp độ JLPT" id="edit-jlpt">
            <select
              id="edit-jlpt"
              value={jlpt}
              onChange={(e) => setJlpt(e.target.value as JlptLevel | '')}
              className="kn-input"
              style={{
                width: '100%',
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--kn-border, #d1d5db)',
                background: 'var(--kn-surface, #ffffff)',
                color: 'var(--kn-text, #111827)',
              }}
            >
              <option value="">(Không chọn)</option>
              {JLPT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Nghĩa *" id="edit-meaning">
          <Input
            id="edit-meaning"
            value={meaning}
            onChange={(e) => {
              setMeaning(e.target.value);
              setError(null);
            }}
            required
          />
        </Field>

        <Field label="Câu ví dụ tiếng Nhật" id="edit-example">
          <textarea
            id="edit-example"
            value={example}
            onChange={(e) => setExample(e.target.value)}
            rows={2}
            className="kn-input"
            style={{
              width: '100%',
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--kn-border, #d1d5db)',
              background: 'var(--kn-surface, #ffffff)',
              color: 'var(--kn-text, #111827)',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </Field>

        <Field label="Dịch câu ví dụ" id="edit-example-meaning">
          <textarea
            id="edit-example-meaning"
            value={exampleMeaning}
            onChange={(e) => setExampleMeaning(e.target.value)}
            rows={2}
            className="kn-input"
            style={{
              width: '100%',
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--kn-border, #d1d5db)',
              background: 'var(--kn-surface, #ffffff)',
              color: 'var(--kn-text, #111827)',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </Field>

        <Field label="Ghi chú" id="edit-note">
          <Input
            id="edit-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm nếu có"
          />
        </Field>
      </div>
    </Modal>
  );
}
