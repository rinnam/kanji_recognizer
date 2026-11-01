import { type ReactElement } from 'react';

/**
 * Họa tiết các chú mèo bao quanh khung thẻ Flashcard:
 * - Chú mèo đen ngáp ngủ to tướng vươn vai cực kỳ đáng yêu (*oah~*).
 * - Chú mèo đen lười biếng nằm dài thõng chân.
 * - Mèo đen thò đầu ngắm với đôi mắt to tròn.
 * - Chú mèo cuộn tròn ngủ say sưa với z z z.
 * - Dấu chân mèo (paw prints) dạo quanh viền.
 */
export function CatCardFrame(): ReactElement {
  return (
    <div className="kn-fc-card__cats-overlay" aria-hidden="true">
      <svg
        viewBox="0 0 800 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="kn-fc-card__cats-svg"
        preserveAspectRatio="none"
      >
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* ============================================================ */}
          {/* 1. CHÚ MÈO ĐEN NGÁP NGỦ VƯƠN VAI (GÓC DƯỚI BÊN TRÁI)         */}
          {/* ============================================================ */}
          <g transform="translate(30, 375)">
            {/* Lưng cong vươn vai đặc trưng khi mèo ngáp ngủ */}
            <path
              d="M30 75 C15 75, 10 50, 22 40 C35 28, 50 32, 58 45 C65 55, 62 75, 45 75 Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            {/* Chân trước duỗi dài vươn vai */}
            <path d="M48 65 L70 78 C74 80, 78 78, 76 74 L60 55" fill="currentColor" fillOpacity="0.4" />
            <path d="M40 68 L62 82 C66 84, 70 82, 68 78 L52 60" fill="currentColor" fillOpacity="0.4" />
            
            {/* Đầu mèo hơi ngửa lên để ngáp */}
            <circle cx="28" cy="32" r="14" fill="currentColor" fillOpacity="0.45" />
            {/* 2 Tai mèo cụp nhẹ ra sau khi ngáp */}
            <path d="M16 26 L12 16 L22 20 Z" fill="currentColor" fillOpacity="0.45" />
            <path d="M26 19 L32 11 L36 22 Z" fill="currentColor" fillOpacity="0.45" />
            
            {/* Mắt nhắm tịt lại hình > < khi ngáp ngủ sảng khoái */}
            <path d="M20 28 L24 31 L20 34" stroke="currentColor" strokeWidth="1.6" />
            <path d="M34 28 L30 31 L34 34" stroke="currentColor" strokeWidth="1.6" />
            
            {/* MIỆNG NGÁP TO HÌNH CHỮ O / TAM GIÁC TRÒN */}
            <path
              d="M23 35 C21 44, 33 44, 31 35 Z"
              fill="#fff"
              fillOpacity="0.25"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Chiếc lưỡi nhỏ hồng bên trong miệng ngáp */}
            <path d="M25 40 Q27 42 29 40" stroke="currentColor" strokeWidth="1.4" />

            {/* Ria mép mèo rung rinh */}
            <path d="M16 34 L6 33 M16 37 L5 39" strokeWidth="1.3" opacity="0.8" />
            <path d="M38 34 L48 33 M38 37 L49 39" strokeWidth="1.3" opacity="0.8" />

            {/* Chiếc đuôi đen dài cong vút uể oải */}
            <path d="M20 65 C5 60, -2 40, 6 28 C10 22, 16 26, 12 32 C8 38, 12 50, 22 56" fill="currentColor" fillOpacity="0.4" />

            {/* Âm thanh ngáp ngủ *oah~* */}
            <text
              x="52"
              y="25"
              fill="currentColor"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
              opacity="0.65"
              stroke="none"
            >
              *oah~*
            </text>
          </g>

          {/* ============================================================ */}
          {/* 2. CHÚ MÈO ĐEN LƯỜI BIẾNG NẰM THÕNG CHÂN (MÉP DƯỚI PHẢI)    */}
          {/* ============================================================ */}
          <g transform="translate(670, 420)">
            {/* Thân mèo nằm dài ườn bụng */}
            <path
              d="M15 35 C15 20, 75 18, 85 35 C88 48, 70 55, 45 55 C20 55, 12 45, 15 35 Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            {/* Đầu mèo gối lên chân ngủ say */}
            <circle cx="20" cy="32" r="12" fill="currentColor" fillOpacity="0.45" />
            {/* 2 tai nhỏ cụp */}
            <path d="M12 24 L14 15 L20 22 Z" fill="currentColor" fillOpacity="0.45" />
            <path d="M22 21 L28 15 L29 24 Z" fill="currentColor" fillOpacity="0.45" />
            {/* 2 mắt nhắm nghiền ^ ^ */}
            <path d="M14 31 Q17 28 20 31" strokeWidth="1.5" />
            <path d="M22 31 Q25 28 28 31" strokeWidth="1.5" />
            {/* Chân sau thõng ra lười biếng */}
            <ellipse cx="80" cy="48" rx="6" ry="4" fill="currentColor" fillOpacity="0.4" />
            <ellipse cx="68" cy="51" rx="5" ry="3.5" fill="currentColor" fillOpacity="0.4" />
            {/* Đuôi buông thõng */}
            <path d="M85 35 C100 38, 105 52, 98 60 C94 64, 88 60, 92 55 C96 50, 90 42, 82 40" />

            {/* Chữ z z z bay bổng */}
            <path d="M35 15 L41 15 L35 21 L41 21" strokeWidth="1.3" opacity="0.75" />
            <path d="M46 7 L51 7 L46 12 L51 12" strokeWidth="1.1" opacity="0.6" />
            <path d="M55 0 L59 0 L55 4 L59 4" strokeWidth="1" opacity="0.45" />
          </g>

          {/* ============================================================ */}
          {/* 3. MÈO ĐEN THÒ ĐẦU NHÌN TÒ MÒ (GÓC TRÊN BÊN TRÁI)           */}
          {/* ============================================================ */}
          <g transform="translate(135, 6)">
            {/* Đầu tròn màu đen nhô lên từ viền */}
            <path
              d="M10 30 C10 12, 46 12, 46 30 Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            {/* 2 Tai mèo nhọn dựng đứng */}
            <path d="M13 18 L16 6 L24 14 Z" fill="currentColor" fillOpacity="0.45" />
            <path d="M32 14 L40 6 L43 18 Z" fill="currentColor" fillOpacity="0.45" />
            {/* 2 Mắt mèo đen to tròn long lanh trong bóng tối */}
            <ellipse cx="21" cy="22" rx="3.5" ry="4" fill="#fff" fillOpacity="0.85" />
            <circle cx="21" cy="22" r="2" fill="currentColor" />
            <ellipse cx="35" cy="22" rx="3.5" ry="4" fill="#fff" fillOpacity="0.85" />
            <circle cx="35" cy="22" r="2" fill="currentColor" />
            {/* 2 Bàn chân bám vào mép thẻ */}
            <path d="M8 28 C8 24, 16 24, 16 28 Z" fill="currentColor" fillOpacity="0.4" />
            <path d="M40 28 C40 24, 48 24, 48 28 Z" fill="currentColor" fillOpacity="0.4" />
          </g>

          {/* ============================================================ */}
          {/* 4. CHÚ MÈO CUỘN TRÒN LĂN QUA LĂN LẠI (GÓC TRÊN BÊN PHẢI)    */}
          {/* ============================================================ */}
          <g transform="translate(605, 12)">
            {/* Thân nằm ngửa ưỡn bụng ngủ say */}
            <path
              d="M15 22 C30 12, 58 12, 70 22 C62 27, 24 27, 15 22 Z"
              fill="currentColor"
              fillOpacity="0.08"
            />
            <circle cx="16" cy="18" r="9" fill="currentColor" fillOpacity="0.08" />
            {/* 2 tai nhỏ */}
            <path d="M10 13 L12 6 L17 11" />
            <path d="M18 11 L22 6 L24 13" />
            {/* Đuôi cong lười biếng */}
            <path d="M70 22 C78 20, 82 11, 76 7 C72 4, 70 8, 73 11" />
            {/* 4 chân giơ lên trời ngủ say */}
            <path d="M28 17 L27 10 M34 16 L35 9 M48 16 L47 9 M54 17 L55 10" strokeWidth="1.4" />
          </g>

          {/* ============================================================ */}
          {/* 5. CÁC DẤU CHÂN MÈO ĐEN NHỎ (PAW PRINTS) DẠO QUANH 4 VIỀN   */}
          {/* ============================================================ */}
          {/* Cạnh trái */}
          <g transform="translate(24, 145) scale(0.85)" opacity="0.9">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>
          <g transform="translate(18, 220) rotate(-15) scale(0.75)" opacity="0.8">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>
          <g transform="translate(26, 295) rotate(12) scale(0.8)" opacity="0.85">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>

          {/* Cạnh phải */}
          <g transform="translate(755, 160) rotate(15) scale(0.8)" opacity="0.85">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>
          <g transform="translate(760, 235) rotate(-10) scale(0.75)" opacity="0.8">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>
          <g transform="translate(750, 310) rotate(20) scale(0.85)" opacity="0.85">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>

          {/* Cạnh dưới */}
          <g transform="translate(320, 465) rotate(6) scale(0.75)" opacity="0.75">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>
          <g transform="translate(480, 465) rotate(-8) scale(0.75)" opacity="0.75">
            <ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </g>
        </g>
      </svg>
    </div>
  );
}
