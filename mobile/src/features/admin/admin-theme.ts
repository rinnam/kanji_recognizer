import { Platform } from 'react-native';

export const adminTheme = {
  colors: {
    bgCanvas: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceSubtle: '#F9FAFB',
    border: '#E4E4E7',
    borderStrong: '#D4D4D8',
    textPrimary: '#18181B',
    textSecondary: '#52525B',
    textMuted: '#71717A',
    accent: '#F48A34',
    accentHover: '#EA7A1E',
    accentSoft: '#FFF7ED',
    accentBorder: '#FDBA74',
    chipBg: '#F4F4F5',
    chipBorder: '#E4E4E7',
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    dangerText: '#DC2626',
    successBg: '#ECFDF5',
    successBorder: '#BBF7D0',
    successText: '#1B873F',
    warningBg: '#FFF7ED',
    warningText: '#C25E00',
    infoBg: '#EFF6FF',
    infoText: '#1D4ED8',
  },
  radius: {
    card: 16,
    md: 12,
    input: 10,
    pill: 9999,
  },
} as const;

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function formatDateVn(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeVn(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCsvCell(raw: string | number | boolean | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  const str = String(raw);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsvFile(
  fileName: string,
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>>,
): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof Blob === 'undefined') {
    return false;
  }
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const csvBody = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
