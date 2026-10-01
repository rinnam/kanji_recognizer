import { type ReactElement } from 'react';
import { Field, Input } from '../../../shared/ui';
import type { JlptLevel } from '../../../shared/api';

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface VocabularyFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  jlpt: JlptLevel | null;
  onJlptChange: (value: JlptLevel | null) => void;
}

/** Bộ lọc Overview: ô tìm kiếm (debounce ở Overview) + chọn JLPT. */
export function VocabularyFilters({
  search,
  onSearchChange,
  jlpt,
  onJlptChange,
}: VocabularyFiltersProps): ReactElement {
  return (
    <div className="kn-vfilters">
      <Field id="vf-search" label="Tìm kiếm">
        <Input
          id="vf-search"
          type="search"
          placeholder="Từ, nghĩa, cách đọc…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </Field>
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
