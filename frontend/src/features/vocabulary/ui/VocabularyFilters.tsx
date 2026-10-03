import { type ReactElement } from 'react';
import { Field } from '../../../shared/ui';
import type { JlptLevel } from '../../../shared/api';

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface VocabularyFiltersProps {
  jlpt: JlptLevel | null;
  onJlptChange: (value: JlptLevel | null) => void;
}

/** Bộ lọc Overview: chọn JLPT. (Ô tìm kiếm đã chuyển lên header — Phần 3B.) */
export function VocabularyFilters({
  jlpt,
  onJlptChange,
}: VocabularyFiltersProps): ReactElement {
  return (
    <div className="kn-vfilters">
      <Field id="vf-jlpt" label="JLPT">
        <select
          id="vf-jlpt"
          className="kn-ui-input"
          value={jlpt ?? ''}
          onChange={(event) =>
            onJlptChange(event.target.value === '' ? null : (event.target.value as JlptLevel))
          }
        >
          <option value="">Tất cả</option>
          {JLPT_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
