import Svg, { G, Path, Circle, Ellipse, Text } from 'react-native-svg';

export function CatFrame({ color }: { color: string }) {
  return <Svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="none" fill="none" color={color}>
    <G stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <G transform="translate(30, 375)">
            <Path
              d="M30 75 C15 75, 10 50, 22 40 C35 28, 50 32, 58 45 C65 55, 62 75, 45 75 Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            <Path d="M48 65 L70 78 C74 80, 78 78, 76 74 L60 55" fill="currentColor" fillOpacity="0.4" />
            <Path d="M40 68 L62 82 C66 84, 70 82, 68 78 L52 60" fill="currentColor" fillOpacity="0.4" />
            <Circle cx="28" cy="32" r="14" fill="currentColor" fillOpacity="0.45" />
            <Path d="M16 26 L12 16 L22 20 Z" fill="currentColor" fillOpacity="0.45" />
            <Path d="M26 19 L32 11 L36 22 Z" fill="currentColor" fillOpacity="0.45" />
            <Path d="M20 28 L24 31 L20 34" stroke="currentColor" strokeWidth="1.6" />
            <Path d="M34 28 L30 31 L34 34" stroke="currentColor" strokeWidth="1.6" />
            <Path
              d="M23 35 C21 44, 33 44, 31 35 Z"
              fill="#fff"
              fillOpacity="0.25"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <Path d="M25 40 Q27 42 29 40" stroke="currentColor" strokeWidth="1.4" />
            <Path d="M16 34 L6 33 M16 37 L5 39" strokeWidth="1.3" opacity="0.8" />
            <Path d="M38 34 L48 33 M38 37 L49 39" strokeWidth="1.3" opacity="0.8" />
            <Path d="M20 65 C5 60, -2 40, 6 28 C10 22, 16 26, 12 32 C8 38, 12 50, 22 56" fill="currentColor" fillOpacity="0.4" />
            <Text
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
            </Text>
          </G>
          <G transform="translate(670, 420)">
            <Path
              d="M15 35 C15 20, 75 18, 85 35 C88 48, 70 55, 45 55 C20 55, 12 45, 15 35 Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            <Circle cx="20" cy="32" r="12" fill="currentColor" fillOpacity="0.45" />
            <Path d="M12 24 L14 15 L20 22 Z" fill="currentColor" fillOpacity="0.45" />
            <Path d="M22 21 L28 15 L29 24 Z" fill="currentColor" fillOpacity="0.45" />
            <Path d="M14 31 Q17 28 20 31" strokeWidth="1.5" />
            <Path d="M22 31 Q25 28 28 31" strokeWidth="1.5" />
            <Ellipse cx="80" cy="48" rx="6" ry="4" fill="currentColor" fillOpacity="0.4" />
            <Ellipse cx="68" cy="51" rx="5" ry="3.5" fill="currentColor" fillOpacity="0.4" />
            <Path d="M85 35 C100 38, 105 52, 98 60 C94 64, 88 60, 92 55 C96 50, 90 42, 82 40" />
            <Path d="M35 15 L41 15 L35 21 L41 21" strokeWidth="1.3" opacity="0.75" />
            <Path d="M46 7 L51 7 L46 12 L51 12" strokeWidth="1.1" opacity="0.6" />
            <Path d="M55 0 L59 0 L55 4 L59 4" strokeWidth="1" opacity="0.45" />
          </G>
          <G transform="translate(135, 6)">
            <Path
              d="M10 30 C10 12, 46 12, 46 30 Z"
              fill="currentColor"
              fillOpacity="0.4"
            />
            <Path d="M13 18 L16 6 L24 14 Z" fill="currentColor" fillOpacity="0.45" />
            <Path d="M32 14 L40 6 L43 18 Z" fill="currentColor" fillOpacity="0.45" />
            <Ellipse cx="21" cy="22" rx="3.5" ry="4" fill="#fff" fillOpacity="0.85" />
            <Circle cx="21" cy="22" r="2" fill="currentColor" />
            <Ellipse cx="35" cy="22" rx="3.5" ry="4" fill="#fff" fillOpacity="0.85" />
            <Circle cx="35" cy="22" r="2" fill="currentColor" />
            <Path d="M8 28 C8 24, 16 24, 16 28 Z" fill="currentColor" fillOpacity="0.4" />
            <Path d="M40 28 C40 24, 48 24, 48 28 Z" fill="currentColor" fillOpacity="0.4" />
          </G>
          <G transform="translate(605, 12)">
            <Path
              d="M15 22 C30 12, 58 12, 70 22 C62 27, 24 27, 15 22 Z"
              fill="currentColor"
              fillOpacity="0.08"
            />
            <Circle cx="16" cy="18" r="9" fill="currentColor" fillOpacity="0.08" />
            <Path d="M10 13 L12 6 L17 11" />
            <Path d="M18 11 L22 6 L24 13" />
            <Path d="M70 22 C78 20, 82 11, 76 7 C72 4, 70 8, 73 11" />
            <Path d="M28 17 L27 10 M34 16 L35 9 M48 16 L47 9 M54 17 L55 10" strokeWidth="1.4" />
          </G>
          <G transform="translate(24, 145) scale(0.85)" opacity="0.9">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(18, 220) rotate(-15) scale(0.75)" opacity="0.8">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(26, 295) rotate(12) scale(0.8)" opacity="0.85">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(755, 160) rotate(15) scale(0.8)" opacity="0.85">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(760, 235) rotate(-10) scale(0.75)" opacity="0.8">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(750, 310) rotate(20) scale(0.85)" opacity="0.85">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(320, 465) rotate(6) scale(0.75)" opacity="0.75">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
          <G transform="translate(480, 465) rotate(-8) scale(0.75)" opacity="0.75">
            <Ellipse cx="12" cy="14" rx="5.5" ry="4.5" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="7" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="12" cy="5" r="2" fill="currentColor" fillOpacity="0.25" />
            <Circle cx="17" cy="7" r="2" fill="currentColor" fillOpacity="0.25" />
          </G>
        </G>
  </Svg>;
}
