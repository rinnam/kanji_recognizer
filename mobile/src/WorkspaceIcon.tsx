import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type WorkspaceIconName = 'overview' | 'flashcard' | 'quiz' | 'settings' | 'shuffle' | 'reset' | 'clock' |
  'plus' | 'edit' | 'move' | 'trash' | 'more' | 'chevronDown' | 'chevronRight';

export function WorkspaceIcon({ name, color, size = 18 }: { name: WorkspaceIconName; color: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {name === 'overview' && <>
      <Rect x="3" y="3" width="7" height="7" rx="1" {...common} />
      <Rect x="14" y="3" width="7" height="7" rx="1" {...common} />
      <Rect x="3" y="14" width="7" height="7" rx="1" {...common} />
      <Rect x="14" y="14" width="7" height="7" rx="1" {...common} />
    </>}
    {name === 'flashcard' && <>
      <Path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" {...common} />
      <Path d="m4 12 8 4.5 8-4.5M4 16.5 12 21l8-4.5" {...common} />
    </>}
    {name === 'quiz' && <>
      <Rect x="3" y="5" width="18" height="14" rx="2" {...common} />
      <Path d="M7 9h1m3 0h1m3 0h2M7 13h10m-10 3h6" {...common} />
    </>}
    {name === 'settings' && <>
      <Path d="M4 6h7m4 0h5M4 12h3m4 0h9M4 18h9m4 0h3" {...common} />
      <Circle cx="13" cy="6" r="2" {...common} />
      <Circle cx="9" cy="12" r="2" {...common} />
      <Circle cx="15" cy="18" r="2" {...common} />
    </>}
    {name === 'shuffle' && <>
      <Path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" {...common} />
    </>}
    {name === 'reset' && <>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" {...common} />
      <Path d="M3 3v5h5" {...common} />
    </>}
    {name === 'clock' && <>
      <Circle cx="12" cy="12" r="9" {...common} />
      <Path d="M12 7v5l3 2" {...common} />
    </>}
    {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
    {name === 'edit' && <>
      <Path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" {...common} />
      <Path d="m14 7 3 3" {...common} />
    </>}
    {name === 'move' && <>
      <Path d="M12 3v18M3 12h18" {...common} />
      <Path d="m8 7 4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4" {...common} />
    </>}
    {name === 'trash' && <>
      <Path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" {...common} />
    </>}
    {name === 'more' && <>
      <Circle cx="5" cy="12" r="1" fill={color} />
      <Circle cx="12" cy="12" r="1" fill={color} />
      <Circle cx="19" cy="12" r="1" fill={color} />
    </>}
    {name === 'chevronDown' && <Path d="m7 9 5 5 5-5" {...common} />}
    {name === 'chevronRight' && <Path d="m9 7 5 5-5 5" {...common} />}
  </Svg>;
}
