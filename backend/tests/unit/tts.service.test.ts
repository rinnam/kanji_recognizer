import { describe, expect, it, vi } from 'vitest';
import { cleanTtsPrompt, fetchJapaneseTts } from '../../src/services/tts.service.js';

describe('tts.service cleanTtsPrompt', () => {
  it('xử lý chuỗi rỗng hoặc khoảng trắng', () => {
    expect(cleanTtsPrompt('')).toBe('');
    expect(cleanTtsPrompt('   ')).toBe('');
  });

  it('lấy đoạn đầu tiên khi có dấu phân cách lựa chọn', () => {
    expect(cleanTtsPrompt('重要な / じゅうような')).toBe('重要な');
    expect(cleanTtsPrompt('たべる、くらう')).toBe('たべる');
    expect(cleanTtsPrompt('いく; ゆく')).toBe('いく');
  });

  it('cắt bỏ khoảng trắng thừa ở hai đầu', () => {
    expect(cleanTtsPrompt('   ねこ   ')).toBe('ねこ');
  });
});

describe('tts.service fetchJapaneseTts', () => {
  it('trả về null ngay khi chuỗi rỗng', async () => {
    const mockFetch = vi.fn();
    const result = await fetchJapaneseTts('', mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('gọi Google Translate TTS và trả về buffer audio khi thành công', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const mockResponse = {
      ok: true,
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      arrayBuffer: async () => fakeBytes,
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchJapaneseTts('重要な', mockFetch as unknown as typeof fetch);
    expect(result).not.toBeNull();
    expect(result?.contentType).toBe('audio/mpeg');
    expect(result?.buffer.length).toBe(4);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const calledUrl = String(firstCall?.[0]);
    expect(calledUrl).toContain('translate_tts');
    expect(calledUrl).toContain('tl=ja');
    expect(calledUrl).toContain(encodeURIComponent('重要な'));
  });

  it('trả về null khi dịch vụ ngoài trả về lỗi HTTP', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchJapaneseTts('テスト', mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
  });

  it('trả về null khi fetch ném ngoại lệ mạng/timeout', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const result = await fetchJapaneseTts('テスト', mockFetch as unknown as typeof fetch);
    expect(result).toBeNull();
  });
});
