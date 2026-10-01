import { useCallback, useEffect, useState } from 'react';
import { createDeck, deleteDeck, getLibrary, getLibraryErrorMessage, updateDeck } from './api';
import { DeckTree } from './DeckTree';
import type { ApiError, Deck, LibraryFilters, LibraryResponse } from './types';

const initialFilters: LibraryFilters = { q: '', kind: '', deckId: '', jlptLevel: '', sort: 'saved-desc' };

export function LibraryScreen() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<LibraryResponse>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (cursor?: string, append = false) => {
    await Promise.resolve();
    setStatus('loading');
    try {
      const response = await getLibrary(filters, cursor);
      setData((current) => append && current ? { ...response, items: [...current.items, ...response.items] } : response);
      setStatus('ready');
    } catch (reason) {
      const error = reason as ApiError;
      setMessage(getLibraryErrorMessage(error));
      setStatus(error.code === 'OFFLINE' ? 'offline' : 'error');
    }
  }, [filters]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const mutate = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (reason) {
      const error = reason as ApiError;
      setNotice(getLibraryErrorMessage(error));
      await load();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const updateFilter = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));

  const selectedDeck = data?.decks.find((deck) => deck.id === filters.deckId);
  const kindLabels: Record<string, string> = { kanji: 'Kanji', vocabulary: 'Từ vựng', grammar: 'Ngữ pháp' };
  const sourceLabels: Record<string, string> = { reference: 'Nguồn tham khảo', import: 'Nhập dữ liệu', manual: 'Nhập thủ công' };

  return <section id="library" className="library-screen" aria-labelledby="library-title">
    <header className="library-header">
      <div><p className="kicker">Bộ sưu tập tiếng Nhật</p><h1 id="library-title">Thư viện</h1><p>Tìm và sắp xếp các mục tiếng Nhật bạn đã lưu.</p></div>
      {data && <span className="version-chip" aria-label={`Phiên bản Thư viện ${data.version}`}>Đã đồng bộ · v{data.version}</span>}
    </header>

    {notice && <p className={notice.includes('thay đổi ở nơi khác') ? 'notice warning' : 'notice'} role="status">{notice}</p>}
    <div className="library-layout">
      <DeckTree decks={data?.decks ?? []} selectedDeckId={filters.deckId} busy={busy}
        onSelect={(deckId) => updateFilter('deckId', deckId)}
        onCreate={(name, description, parentId) => mutate(() => createDeck(name, description, parentId), 'Đã tạo bộ thẻ.')}
        onUpdate={(deck: Deck, changes) => mutate(() => updateDeck(deck, changes), changes.parentId !== undefined ? 'Đã di chuyển bộ thẻ.' : 'Đã cập nhật bộ thẻ.')}
        onDelete={(deck: Deck) => mutate(async () => { await deleteDeck(deck); if (filters.deckId === deck.id) updateFilter('deckId', ''); }, 'Đã xóa vĩnh viễn bộ thẻ. Không thể hoàn tác thao tác này. Nội dung đã lưu vẫn được giữ lại.')} />
      <div className="library-content">
        {/* There is no real eligible-unsaved content source in the current UI, so no primary Save action is exposed. */}
        <form className="library-filters" role="search" aria-label="Tìm kiếm và lọc mục đã lưu" onSubmit={(event) => event.preventDefault()}>
          <label className="search-field"><span>Tìm trong thư viện</span><input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Tìm nội dung tiếng Nhật đã lưu…" /></label>
          <label><span>Loại</span><select value={filters.kind} onChange={(event) => updateFilter('kind', event.target.value as LibraryFilters['kind'])}><option value="">Tất cả loại</option><option value="kanji">Kanji</option><option value="vocabulary">Từ vựng</option><option value="grammar">Ngữ pháp</option></select></label>
          <label><span>JLPT</span><select value={filters.jlptLevel} onChange={(event) => updateFilter('jlptLevel', event.target.value as LibraryFilters['jlptLevel'])}><option value="">Mọi cấp độ</option>{[1,2,3,4,5].map((level) => <option key={level} value={level}>N{level}</option>)}</select></label>
          <label><span>Sắp xếp</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value as LibraryFilters['sort'])}><option value="saved-desc">Mới lưu</option><option value="saved-asc">Lưu lâu nhất</option><option value="key-asc">Tiếng Nhật A–Z</option><option value="key-desc">Tiếng Nhật Z–A</option></select></label>
          <button type="button" className="reset-filters" onClick={() => setFilters(initialFilters)}>Xóa bộ lọc</button>
        </form>
        <div className="results-heading"><div><p className="kicker">{selectedDeck ? 'Bộ thẻ đã chọn' : 'Bộ sưu tập'}</p><h2>{selectedDeck?.name ?? 'Mục đã lưu'}</h2></div>{data && <span>Đã tải {data.items.length} mục</span>}</div>
        <div className="library-results" aria-live="polite" aria-busy={status === 'loading'}>
        {status === 'loading' && !data && <div className="library-state"><h3>Đang tải thư viện…</h3><p>Đang đọc các mục đã lưu và cấu trúc bộ thẻ.</p></div>}
        {status === 'offline' && <div className="library-state" role="alert"><h3>Bạn đang ngoại tuyến</h3><p>{message}</p><button onClick={() => void load()}>Thử lại</button></div>}
        {status === 'error' && <div className="library-state" role="alert"><h3>Không thể tải Thư viện</h3><p>{message}</p><button onClick={() => void load()}>Thử lại</button></div>}
        {status === 'ready' && data?.items.length === 0 && <div className="library-state"><h3>Không có mục đã lưu phù hợp</h3><p>Hãy xóa bộ lọc hoặc chọn bộ thẻ khác. Màn hình này không nhập nội dung mới.</p></div>}
        {data && data.items.length > 0 && <><p className="result-summary">Đang hiển thị {data.items.length} mục đã lưu{status === 'loading' ? ' · đang làm mới…' : ''}</p><div className="library-grid">
          {data.items.map((item) => <article className="library-card" key={item.id}>
            <span className="item-kind">{kindLabels[item.kind] ?? 'Loại chưa xác định'}</span><h3 lang="ja">{item.canonicalKey}</h3>
            <dl><div><dt>JLPT</dt><dd>{item.jlptLevel ? `N${item.jlptLevel}` : 'Chưa cung cấp'}</dd></div><div><dt>Nguồn</dt><dd>{sourceLabels[item.sourceKind] ?? 'Nguồn chưa xác định'}</dd></div></dl>
            {item.sourceRef ? <p className="source-ref">{item.sourceRef}</p> : <p className="partial-note">Chưa có chi tiết nguồn</p>}
          </article>)}
        </div>{data.nextCursor && <button className="load-more" disabled={status === 'loading'} onClick={() => void load(data.nextCursor!, true)}>Tải thêm</button>}</>}
        </div>
      </div>
    </div>
  </section>;
}
