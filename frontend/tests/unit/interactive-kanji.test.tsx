import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InteractiveKanjiText } from '../../src/entities/kanji';

describe('entities/kanji InteractiveKanjiText', () => {
  afterEach(cleanup);

  it('render tách bạch giữa Kanji và Kana', () => {
    render(
      <InteractiveKanjiText
        text="豊かな"
        sinoVietnamese="PHONG"
        meaning="giàu có, phong phú"
      />,
    );

    // Ký tự Kanji 豊 có role button
    const kanjiBtn = screen.getByRole('button', { name: /Chữ Hán 豊/ });
    expect(kanjiBtn).toBeInTheDocument();
    expect(kanjiBtn).toHaveTextContent('豊');

    // Chữ 'かな' hiển thị bình thường
    expect(screen.getByText(/かな/)).toBeInTheDocument();
  });

  it('bấm vào chữ Kanji mở popover chi tiết và chặn nổi bọt sự kiện (stopPropagation)', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <InteractiveKanjiText
          text="豊かな"
          sinoVietnamese="PHONG"
          meaning="giàu có, phong phú"
        />
      </div>,
    );

    const kanjiBtn = screen.getByRole('button', { name: /Chữ Hán 豊/ });
    fireEvent.click(kanjiBtn);

    // Không kích hoạt sự kiện click thẻ cha (tránh lật Flashcard)
    expect(parentClick).not.toHaveBeenCalled();

    // Mở Popover dialog
    const dialog = screen.getByRole('dialog', { name: /Thông tin chữ Hán 豊/ });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('PHONG');
    expect(dialog).toHaveTextContent('ホウ');
    expect(dialog).toHaveTextContent('ゆた.か');
    expect(dialog).toHaveTextContent('13 nét');
    expect(dialog).toHaveTextContent('N1');

    // Bấm nút đóng
    const closeBtn = screen.getByRole('button', { name: /Đóng bảng chữ Hán/ });
    fireEvent.click(closeBtn);
    expect(parentClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hỗ trợ phím Enter để mở popover khi dùng bàn phím', () => {
    render(
      <InteractiveKanjiText
        text="本"
        sinoVietnamese="BẢN"
        meaning="sách, nguồn gốc"
      />,
    );

    const kanjiBtn = screen.getByRole('button', { name: /Chữ Hán 本/ });
    fireEvent.keyDown(kanjiBtn, { key: 'Enter' });

    expect(screen.getByRole('dialog', { name: /Thông tin chữ Hán 本/ })).toBeInTheDocument();

    // Phím Escape đóng dialog
    fireEvent.keyDown(kanjiBtn, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
