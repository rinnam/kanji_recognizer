import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryScreen } from '../src/features/library/LibraryScreen';

const root = { id: '00000000-0000-4000-8000-000000000001', parentId: null, sortPosition: '1024', name: '日本語', description: null, version: '1' };
const child = { ...root, id: '00000000-0000-4000-8000-000000000002', parentId: root.id, name: 'N3', sortPosition: '2048' };
const payload = { id: 'library', ownerId: 'owner', version: '2', decks: [root, child], nextCursor: null, items: [{ id: 'saved', contentItemId: 'content', kind: 'vocabulary', canonicalKey: '日本語', jlptLevel: 3, sourceKind: 'reference', sourceRef: null, savedAt: '2026-01-01T00:00:00.000Z', version: '1', deckIds: [child.id] }] };

function response(body: unknown = payload, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('LibraryScreen', () => {
  it('renders persisted records, hierarchy and partial metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response()));
    render(<LibraryScreen />);
    expect(await screen.findByRole('heading', { name: '日本語' })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /日本語/ })).toHaveAttribute('aria-level', '1');
    expect(screen.getByRole('button', { name: 'Bộ thẻMục đã lưu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Chưa có chi tiết nguồn')).toBeInTheDocument();
    expect(screen.getAllByText('Từ vựng')).toHaveLength(2);
    expect(screen.getByText('Nguồn tham khảo')).toBeInTheDocument();
  });

  it('sends Japanese search and filters to the API', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => { void input; return response(); });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    await user.type(screen.getByLabelText('Tìm trong thư viện'), '森');
    await user.selectOptions(screen.getByLabelText('Loại'), 'kanji');
    await waitFor(() => expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('q=%E6%A3%AE'));
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('kind=kanji');
  });

  it('creates a child deck and moves with the current version', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => init?.method ? response(root, 201) : response());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    await user.click(screen.getByRole('button', { name: 'Tạo bộ thẻ con trong 日本語' }));
    await user.type(screen.getByLabelText('Tên bộ thẻ'), 'Bộ thẻ con');
    await user.click(screen.getByRole('button', { name: 'Tạo' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/v1/library/decks', expect.objectContaining({ method: 'POST', body: expect.stringContaining(root.id) })));
    await user.click(screen.getByRole('button', { name: 'Di chuyển N3' }));
    await user.selectOptions(screen.getByLabelText('Di chuyển “N3” vào'), '');
    await user.click(screen.getByRole('button', { name: 'Lưu vị trí' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/v1/library/decks/${child.id}`, expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"expectedVersion":"1"') })));
  });

  it('does not expose a primary Save action without a real eligible-unsaved content source', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response()));
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    expect(screen.queryByText('Save known content ID')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save content/i })).not.toBeInTheDocument();
  });

  it('edits deck metadata and sends its current version', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => init?.method ? response(root) : response());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa 日本語' }));
    await user.clear(screen.getByLabelText('Tên bộ thẻ'));
    await user.type(screen.getByLabelText('Tên bộ thẻ'), 'Tiếng Nhật');
    await user.type(screen.getByLabelText('Mô tả'), 'Bộ thẻ học cốt lõi');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/v1/library/decks/${root.id}`, expect.objectContaining({
      method: 'PATCH', body: expect.stringContaining('"expectedVersion":"1"')
    })));
  });

  it('confirms child-first deletion and preserves content wording', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => init?.method === 'DELETE' ? response(undefined, 204) : response());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    await user.click(screen.getByRole('button', { name: 'Xóa N3' }));
    expect(screen.getByText(/Không thể hoàn tác thao tác này trong phiên bản hiện tại/)).toBeInTheDocument();
    expect(screen.getByText(/xóa các bộ thẻ con đang hoạt động trước/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn bộ thẻ' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/v1/library/decks/${child.id}?expectedVersion=1`, expect.objectContaining({ method: 'DELETE' })));
    expect(await screen.findByText(/Nội dung đã lưu vẫn được giữ lại/)).toBeInTheDocument();
    expect(screen.getByText(/Không thể hoàn tác/)).toBeInTheDocument();
  });

  it('reloads and reports a version conflict', async () => {
    let mutationAttempted = false;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') { mutationAttempted = true; return response({ code: 'CONFLICT', message: 'stale' }, 409); }
      return response();
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    await user.click(screen.getByRole('button', { name: 'Di chuyển N3' }));
    await user.selectOptions(screen.getByLabelText('Di chuyển “N3” vào'), '');
    await user.click(screen.getByRole('button', { name: 'Lưu vị trí' }));
    expect(await screen.findByText(/Mục này đã được thay đổi ở nơi khác/)).toBeInTheDocument();
    expect(mutationAttempted).toBe(true);
    expect(fetchMock.mock.calls.filter(([, init]) => !init?.method).length).toBeGreaterThan(1);
  });

  it('supports Escape dismissal and returns focus to the dialog trigger', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response()));
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await screen.findByRole('heading', { name: '日本語' });
    const trigger = screen.getByRole('button', { name: 'Chỉnh sửa 日本語' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Chỉnh sửa 日本語' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tên bộ thẻ')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Chỉnh sửa 日本語' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not render raw backend error messages', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ code: 'NOT_FOUND', message: 'Deck not found' }, 404)));
    render(<LibraryScreen />);
    expect(await screen.findByText('Mục bạn yêu cầu trong Thư viện không còn tồn tại.')).toBeInTheDocument();
    expect(screen.queryByText('Deck not found')).not.toBeInTheDocument();
  });

  it('shows offline recovery state', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))));
    render(<LibraryScreen />);
    expect(await screen.findByRole('heading', { name: 'Bạn đang ngoại tuyến' })).toBeInTheDocument();
    expect(screen.getByText('Thư viện không khả dụng khi bạn đang ngoại tuyến.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
