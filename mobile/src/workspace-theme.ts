import { StyleSheet } from 'react-native';

const light = {
  bg: '#efe9dc', surface: '#faf6ee', ink: '#2b2622', muted: '#6b6257',
  border: '#d8cfbe', primary: '#b4532a', contrast: '#ffffff', selection: '#f1e1d5',
  buttonBorder: '#8a7f6e',
};
const dark: typeof light = {
  bg: '#1c1917', surface: '#262220', ink: '#ece5d8', muted: '#a79e8e',
  border: '#3a342f', primary: '#e2794b', contrast: '#1c1917', selection: '#3c3028',
  buttonBorder: '#7d7366',
};

export function workspaceTheme(isDark: boolean, compact = false) {
  const colors = isDark ? dark : light;
  return {
    compact,
    colors,
    styles: StyleSheet.create({
      screen: { flex: 1, backgroundColor: colors.bg },
      header: {
        minHeight: compact ? 0 : 56, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: compact ? 8 : 5, gap: 8,
        borderBottomWidth: 1, borderColor: colors.border,
      },
      headerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
      searchGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
      searchCompact: { flex: 0, alignSelf: 'stretch', minHeight: 44 },
      searchWide: { justifyContent: 'center' },
      search: {
        flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 12, borderRadius: 8,
        backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, color: colors.ink,
      },
      body: { flexDirection: 'row', flex: 1, gap: 16, paddingHorizontal: 16, paddingVertical: compact ? 12 : 24 },
      sidebar: {
        width: 288, maxWidth: '86%', borderRadius: 10, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.surface, padding: 12, gap: 8,
      },
      content: { flex: 1, minWidth: 0, gap: 12 },
      toolbar: {
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: compact ? 6 : 4, gap: compact ? 6 : 8, minHeight: compact ? 0 : 54,
      },
      actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
      tabs: {
        flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'flex-start', padding: 3,
        borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.selection,
      },
      bottomNav: {
        flexDirection: 'row', flexShrink: 0, gap: 4, padding: 4,
        borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
      },
      navItem: { flex: 1, alignItems: 'center', paddingHorizontal: 1 },
      wordCard: {
        gap: 3, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
        backgroundColor: colors.surface, marginBottom: 6,
      },
      studyCard: { padding: compact ? 12 : 0, gap: 13, backgroundColor: compact ? colors.surface : 'transparent', borderRadius: 10 },
      studyShell: { width: '100%', maxWidth: 800, alignSelf: 'center', gap: compact ? 8 : 13, paddingBottom: compact ? 10 : 0 },
      studyControl: {
        minHeight: compact ? 52 : 66, padding: compact ? 6 : 12, gap: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 12,
        backgroundColor: colors.surface,
      },
      studyCanvas: {
        height: compact ? 280 : 448, borderWidth: 1, borderColor: colors.border, borderRadius: 16,
        backgroundColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: compact ? 18 : 32,
      },
      overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0006', padding: 12 },
      editorWrap: { width: '100%', maxWidth: 560, maxHeight: '92%' },
      dialog: { flexGrow: 0, backgroundColor: colors.surface, borderRadius: 12 },
      input: {
        minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8,
        borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.bg, color: colors.ink,
      },
      button: {
        minHeight: compact ? 44 : 36, justifyContent: 'center', paddingHorizontal: compact ? 10 : 12, borderWidth: 1,
        borderColor: colors.buttonBorder, borderRadius: 8, backgroundColor: colors.bg,
      },
      denseButton: { minHeight: 36, paddingHorizontal: 8, borderRadius: 7 },
      iconOnlyButton: { alignItems: 'center', justifyContent: 'center', gap: 0 },
      active: { borderColor: colors.primary, backgroundColor: colors.primary },
      folderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        borderColor: 'transparent', backgroundColor: colors.surface },
      tabButton: { borderColor: 'transparent', backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 6 },
      tabText: { fontSize: compact ? 12 : 14 },
      scopedActive: { borderColor: colors.primary, backgroundColor: colors.selection },
      scopedText: { color: colors.primary, fontWeight: '600' },
      focus: { borderColor: colors.primary, borderWidth: 2 },
      buttonText: { color: colors.ink },
      activeText: { color: colors.contrast },
      muted: { color: colors.muted },
      row: {
        flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 10,
        borderBottomWidth: 1, borderColor: colors.border, gap: 8,
      },
      tableHeader: { backgroundColor: colors.surface, minHeight: 34 },
      field: { color: colors.ink, minWidth: 0, fontSize: 16 },
      card: { gap: 4, padding: 12, borderBottomWidth: 1, borderColor: colors.border },
      pill: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 18, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.bg, color: colors.ink,
      },
    }),
  };
}

export type WorkspaceTheme = ReturnType<typeof workspaceTheme>;
