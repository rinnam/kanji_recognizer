import { type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_TAB, parseTab, SEARCH_PARAM, TAB_PARAM } from '../routes';
import { IconClose, IconSearch } from '../shared/ui';
import './HeaderSearch.css';

/**
 * Ô tìm kiếm trên header, dùng chung với Overview qua URL param `q`
 * (useSearchParams, replace, giữ nguyên các param khác như `tab`).
 * Gõ khi đang ở tab khác Tổng quan sẽ nhảy về Tổng quan để thấy kết quả.
 */
export function HeaderSearch(): ReactElement {
  const [params, setParams] = useSearchParams();
  const value = params.get(SEARCH_PARAM) ?? '';

  const setQuery = (next: string): void => {
    const nextParams = new URLSearchParams(params);
    if (next === '') {
      nextParams.delete(SEARCH_PARAM);
    } else {
      nextParams.set(SEARCH_PARAM, next);
      if (parseTab(nextParams.get(TAB_PARAM)) !== DEFAULT_TAB) {
        nextParams.set(TAB_PARAM, DEFAULT_TAB);
      }
    }
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="kn-hsearch">
      <IconSearch className="kn-hsearch__icon" />
      <input
        type="search"
        className="kn-hsearch__input"
        placeholder="Từ, nghĩa, cách đọc…"
        aria-label="Tìm kiếm từ vựng"
        value={value}
        onChange={(event) => setQuery(event.target.value)}
      />
      {value !== '' ? (
        <button
          type="button"
          className="kn-hsearch__clear"
          aria-label="Xóa tìm kiếm"
          onClick={() => setQuery('')}
        >
          <IconClose />
        </button>
      ) : null}
    </div>
  );
}
