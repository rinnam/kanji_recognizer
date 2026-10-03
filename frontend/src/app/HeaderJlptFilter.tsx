import { type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_TAB, JLPT_PARAM, parseJlpt, parseTab, TAB_PARAM } from '../routes';
import { JLPT_LEVELS } from '../shared/api';
import './HeaderJlptFilter.css';

/**
 * Bộ lọc JLPT trên header, dùng chung với Overview qua URL param `jlpt`
 * (useSearchParams, replace, giữ nguyên các param khác như `tab`/`q`).
 * Chọn cấp khi đang ở tab khác Tổng quan sẽ nhảy về Tổng quan để thấy kết quả.
 */
export function HeaderJlptFilter(): ReactElement {
  const [params, setParams] = useSearchParams();
  const value = parseJlpt(params.get(JLPT_PARAM)) ?? '';

  const setLevel = (next: string): void => {
    const nextParams = new URLSearchParams(params);
    if (next === '') {
      nextParams.delete(JLPT_PARAM);
    } else {
      nextParams.set(JLPT_PARAM, next);
      if (parseTab(nextParams.get(TAB_PARAM)) !== DEFAULT_TAB) {
        nextParams.set(TAB_PARAM, DEFAULT_TAB);
      }
    }
    setParams(nextParams, { replace: true });
  };

  return (
    <label className="kn-hjlpt">
      <span className="kn-hjlpt__label">JLPT</span>
      <select
        className="kn-ui-input kn-hjlpt__select"
        aria-label="Lọc theo cấp JLPT"
        value={value}
        onChange={(event) => setLevel(event.target.value)}
      >
        <option value="">Tất cả</option>
        {JLPT_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </label>
  );
}
