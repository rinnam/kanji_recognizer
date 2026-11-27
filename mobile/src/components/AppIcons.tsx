import React from 'react';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function ShuffleIcon({ size = 16, color = '#4A3E35' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ResetIcon({ size = 16, color = '#4A3E35' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockIcon({ size = 15, color = '#6E6055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function VolumeIcon({ size = 15, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BulbIcon({ size = 15, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlayIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="6,4 20,12 6,20" fill={color} />
    </Svg>
  );
}

export function PauseIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="6" y="4" width="4" height="16" rx="1" fill={color} />
      <Rect x="14" y="4" width="4" height="16" rx="1" fill={color} />
    </Svg>
  );
}

export function PrevIcon({ size = 16, color = '#4A3E35' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 20L9 12l10-8v16zM5 19V5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function NextIcon({ size = 16, color = '#4A3E35' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4l10 8-10 8V4zM19 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function RepeatIcon({ size = 15, color = '#6E6055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MicIcon({ size = 15, color = '#991B1B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

interface NavIconProps extends IconProps {
  active?: boolean;
}

export function HomeNavIcon({ size = 21, color = '#6E6E73', active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H4.5A1.5 1.5 0 0 1 3 20v-9.5z"
        fill={active ? 'rgba(244, 138, 52, 0.16)' : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PracticeNavIcon({ size = 21, color = '#6E6E73', active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="6"
        width="14"
        height="14"
        rx="3"
        fill={active ? 'rgba(244, 138, 52, 0.16)' : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M7 3h11a3 3 0 0 1 3 3v11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M10 11l2 2 3.5-3.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchNavIcon({ size = 21, color = '#6E6E73', active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="11"
        cy="11"
        r="7"
        fill={active ? 'rgba(244, 138, 52, 0.16)' : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M20 20l-3.8-3.8" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function LessonsNavIcon({ size = 21, color = '#6E6E73', active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11a3 3 0 0 1 3 3v14.5a2.5 2.5 0 0 0-2.5-2.5H2V5.5z"
        fill={active ? 'rgba(244, 138, 52, 0.16)' : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13a3 3 0 0 0-3 3v14.5a2.5 2.5 0 0 1 2.5-2.5H22V5.5z"
        fill={active ? 'rgba(244, 138, 52, 0.12)' : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ProfileNavIcon({ size = 21, color = '#6E6E73', active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="8"
        r="4"
        fill={active ? 'rgba(244, 138, 52, 0.18)' : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function HeadphonesSkillIcon({ size = 22, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 13v-1a8 8 0 0 1 16 0v1"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Rect x="3" y="13" width="4" height="7" rx="2" fill="rgba(244, 138, 52, 0.18)" stroke={color} strokeWidth={2} />
      <Rect x="17" y="13" width="4" height="7" rx="2" fill="rgba(244, 138, 52, 0.18)" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function SpeakingSkillIcon({ size = 22, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2.5" width="6" height="11" rx="3" fill="rgba(244, 138, 52, 0.18)" stroke={color} strokeWidth={2} />
      <Path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M8.5 21h7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ReadingSkillIcon({ size = 22, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2.5" fill="rgba(244, 138, 52, 0.14)" stroke={color} strokeWidth={2} />
      <Path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function WritingSkillIcon({ size = 22, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z"
        fill="rgba(244, 138, 52, 0.18)"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14.5 5.5l3 3M4 21h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function LockClosedIcon({ size = 20, color = '#8A8A8E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="10" rx="2.5" fill="rgba(138, 138, 142, 0.15)" stroke={color} strokeWidth={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 18, color = '#1E1E1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color = '#1E1E1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FlameStreakIcon({ size = 15, color = '#F48A34' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c.5 3.5-2 5.5-2 8a3.5 3.5 0 0 0 7 0c0-1.8-.8-3.2-1.5-4.3C18.5 8 20 11 20 14a8 8 0 0 1-16 0c0-4.5 3.5-8.5 8-12z"
        fill="rgba(244, 138, 52, 0.22)"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CrownIcon({ size = 16, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 18h18l-1.5-10-4.5 4-3-6-3 6-4.5-4L3 18zM4 21h16"
        fill="rgba(244, 138, 52, 0.22)"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CoinKsIcon({ size = 16, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="rgba(244, 138, 52, 0.2)" stroke={color} strokeWidth={2} />
      <Path d="M12 7v10M9 10l3-3 3 3M9 14l3 3 3-3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ShieldCheckIcon({ size = 16, color = '#2F9E62' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"
        fill="rgba(47, 158, 98, 0.16)"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function GrammarSkillIcon({ size = 22, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="8" height="7" rx="2" fill="rgba(244, 138, 52, 0.18)" stroke={color} strokeWidth={2} />
      <Rect x="13" y="4" width="8" height="7" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="3" y="13.5" width="7" height="6.5" rx="2" stroke={color} strokeWidth={2} />
      <Polygon
        points="16.5,12.5 17.8,15.3 20.8,15.7 18.6,17.8 19.2,20.8 16.5,19.3 13.8,20.8 14.4,17.8 12.2,15.7 15.2,15.3"
        fill="rgba(244, 138, 52, 0.24)"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BossSwordIcon({ size = 22, color = '#DC2626' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 3.5L20.5 3.5L20.5 9.5L11 19L5 13L14.5 3.5Z"
        fill="rgba(220, 38, 38, 0.14)"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.5 20.5L7.5 16.5M5 13L3.5 14.5M11 19L9.5 20.5M4.5 5.5L9.5 10.5M14.5 13.5L18.5 17.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SushiPlateIcon({ size = 22, color = '#0D9488' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12.5" r="8.5" fill="rgba(13, 148, 136, 0.14)" stroke={color} strokeWidth={2} />
      <Rect x="6.5" y="9" width="11" height="5.5" rx="2.75" fill="#FFFFFF" stroke={color} strokeWidth={2} />
      <Path d="M10.5 9v5.5M13.5 9v5.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function StarPuzzleIcon({ size = 22, color = '#D97706' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="12,3 14.7,8.7 21,9.6 16.4,14 17.5,20.3 12,17.3 6.5,20.3 7.6,14 3,9.6 9.3,8.7"
        fill="rgba(217, 119, 6, 0.18)"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LightningBoltIcon({ size = 22, color = '#4F46E5' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="13,2 4,14 11.5,14 10.5,22 20,10 12.5,10"
        fill="rgba(79, 70, 229, 0.16)"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TrophyArenaIcon({ size = 22, color = '#EA7A1E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4h10v6a5 5 0 0 1-10 0V4z"
        fill="rgba(234, 122, 30, 0.18)"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M7 6H4.5a1.5 1.5 0 0 0-1.5 1.5V9a3 3 0 0 0 3 3h1M17 6h2.5A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3h-1M12 15v4M8.5 21h7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface HeartIconProps extends IconProps {
  filled?: boolean;
}

export function HeartIcon({ size = 16, color = '#DC2626', filled = true }: HeartIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.4s-7.5-4.7-9.2-9.2C1.7 8.1 3.7 5 6.8 5c1.9 0 3.4 1 4.2 2.2C11.8 6 13.3 5 15.2 5c3.1 0 5.1 3.1 4 6.2-1.7 4.5-7.2 9.2-7.2 9.2z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MoreVerticalIcon({ size = 18, color = '#4A3E35' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5.5" r="1.75" fill={color} />
      <Circle cx="12" cy="12" r="1.75" fill={color} />
      <Circle cx="12" cy="18.5" r="1.75" fill={color} />
    </Svg>
  );
}

export function TranslateIcon({ size = 17, color = '#6E6055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 8h8M9 6v2c0 3.5-1.8 6.4-4 8M7 11.5c1.2 1.6 2.8 3 4.8 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 19l3.5-9L20 19M14.2 16.5h4.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SubtitlesIcon({ size = 17, color = '#6E6055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M7 12h4M13 12h4M7 15.5h6M15 15.5h2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
