import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { lookupKanji } from '../model/kanji-dict';
import { extractKanji, mapSinoForKanjiIndex, segmentJapaneseWord } from '../model/kanji-utils';
import type { KanjiDetail } from '../model/types';
import { KanjiPopover } from './KanjiPopover';
import './kanji.css';

export interface InteractiveKanjiTextProps {
  /** Văn bản tiếng Nhật cần hiển thị (ví dụ "豊かな", "重要な"). */
  text: string;
  /** Âm Hán Việt đi kèm của từ vựng (ví dụ "PHONG", "TRỌNG YẾU"). */
  sinoVietnamese?: string | null;
  /** Nghĩa tiếng Việt của từ vựng để hỗ trợ ngữ cảnh. */
  meaning?: string | null;
  /** Class CSS tùy biến. */
  className?: string;
}

interface IndexedSegment {
  text: string;
  isKanji: boolean;
  kanjiIndex: number;
}

function toIndexedSegments(segments: readonly { text: string; isKanji: boolean }[]): IndexedSegment[] {
  let counter = 0;
  return segments.map((seg) => {
    if (seg.isKanji) {
      const idx = counter;
      counter += 1;
      return { ...seg, kanjiIndex: idx };
    }
    return { ...seg, kanjiIndex: -1 };
  });
}

/**
 * Hiển thị từ vựng tiếng Nhật với cơ chế tương tác thông minh cho từng chữ Hán (Kanji):
 * - Rê chuột (Hover): Ký tự được highlight vàng nhạt + hiện tooltip âm Hán Việt / nghĩa ngắn nổi trên đầu.
 * - Bấm (Click/Tap): Mở thẻ Kanji Popover đầy đủ (Hán tự to, On/Kun, JLPT, số nét, nghĩa).
 * - Tự động chặn nổi bọt sự kiện (stopPropagation) để không kích hoạt lật thẻ flashcard.
 */
export function InteractiveKanjiText({
  text,
  sinoVietnamese,
  meaning,
  className,
}: InteractiveKanjiTextProps): ReactElement {
  const [activeKanjiIndex, setActiveKanjiIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  const segments = useMemo(() => segmentJapaneseWord(text), [text]);
  const totalKanji = useMemo(() => extractKanji(text).length, [text]);
  const indexedSegments = useMemo(() => toIndexedSegments(segments), [segments]);

  // Đóng popover khi bấm ra ngoài
  useEffect(() => {
    if (activeKanjiIndex === null) return;

    const handleOutsideClick = (e: globalThis.MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveKanjiIndex(null);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [activeKanjiIndex]);

  return (
    <span
      ref={containerRef}
      className={['kn-kanji-interactive', className].filter(Boolean).join(' ')}
    >
      {indexedSegments.map((seg, index) => {
        if (!seg.isKanji) {
          return <Fragment key={index}>{seg.text}</Fragment>;
        }

        const currentKanjiIdx = seg.kanjiIndex;

        const mappedSino = mapSinoForKanjiIndex(
          sinoVietnamese,
          currentKanjiIdx,
          totalKanji,
        );
        const detail: KanjiDetail | null = lookupKanji(
          seg.text,
          mappedSino,
          meaning,
        );

        const isOpen = activeKanjiIndex === currentKanjiIdx;

        // Nội dung hiển thị trên tooltip nổi nhỏ: ưu tiên âm Hán Việt hoặc nghĩa
        const tooltipText =
          detail?.sinoVietnamese || detail?.meaning || mappedSino || 'Hán tự';

        const togglePopover = (e: MouseEvent<HTMLSpanElement>): void => {
          e.stopPropagation();
          setActiveKanjiIndex(isOpen ? null : currentKanjiIdx);
        };

        const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>): void => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setActiveKanjiIndex(isOpen ? null : currentKanjiIdx);
          } else if (e.key === 'Escape') {
            setActiveKanjiIndex(null);
          }
        };

        return (
          <span
            key={index}
            className={`kn-kanji-char${isOpen ? ' is-active' : ''}`}
            onClick={togglePopover}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={`Chữ Hán ${seg.text}, bấm để xem chi tiết`}
            title={`Chữ Hán: ${seg.text} (${tooltipText})`}
          >
            {seg.text}

            {/* Tooltip nổi trên đầu chữ khi hover */}
            <span className="kn-kanji-tooltip" aria-hidden="true">
              {tooltipText}
            </span>

            {/* Popover chi tiết khi click */}
            {isOpen && detail ? (
              <KanjiPopover
                kanji={detail}
                onClose={() => setActiveKanjiIndex(null)}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
