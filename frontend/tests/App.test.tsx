import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Library product shell', () => {
  it('leads with the Library and keeps future Recognition unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ id: 'library', ownerId: 'owner', version: '1', decks: [], items: [], nextCursor: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }))));
    render(<App />);

    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thư viện' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Nhận diện', { exact: false })).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByRole('heading', { name: 'Thư viện' })).toBeInTheDocument();
  });

  it('does not expose developer previews, fake learning flows, or capability matrices', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ id: 'library', ownerId: 'owner', version: '1', decks: [], items: [], nextCursor: null }), { status: 200 }))));
    render(<App />);
    await screen.findByRole('heading', { name: 'Thư viện' });

    expect(screen.queryByText(/Runtime capability matrix/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Practice|Review|Progress/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/illustrative|local mock/i)).not.toBeInTheDocument();
  });
});
