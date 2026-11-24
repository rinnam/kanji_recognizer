import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { ShadowingLine } from './types';
import { formatTimestamp } from './shadowing-api';

interface TranscriptListViewProps {
  lines: ShadowingLine[];
  activeIndex: number;
  onSelectLine: (index: number) => void;
}

export function TranscriptListView({
  lines,
  activeIndex,
  onSelectLine,
}: TranscriptListViewProps) {
  const [search, setSearch] = useState('');
  const itemRefs = useRef<Record<number, any>>({});

  const filteredLines = search.trim()
    ? lines
        .map((line, idx) => ({ ...line, originalIndex: idx }))
        .filter((l) => l.text.toLowerCase().includes(search.toLowerCase()))
    : lines.map((line, idx) => ({ ...line, originalIndex: idx }));

  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      const el = itemRefs.current[activeIndex];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Phụ đề video</Text>
          <Text style={styles.counter}>{lines.length} dòng</Text>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm từ khóa trong phụ đề..."
          placeholderTextColor={nihongoTheme.colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={true}>
        {filteredLines.length > 0 ? (
          filteredLines.map((line) => {
            const isActive = line.originalIndex === activeIndex;

            return (
              <View
                key={line.originalIndex}
                ref={(node) => {
                  itemRefs.current[line.originalIndex] = node;
                }}
                style={{ width: '100%' }}
              >
                <Pressable
                  style={[styles.lineItem, isActive && styles.lineItemActive]}
                  onPress={() => onSelectLine(line.originalIndex)}
                >
                  <View style={[styles.timeBadge, isActive && styles.timeBadgeActive]}>
                    <Text style={[styles.timeText, isActive && styles.timeTextActive]}>
                      {formatTimestamp(line.start)}
                    </Text>
                  </View>
                  <Text style={[styles.lineText, isActive && styles.lineTextActive]}>
                    {line.text}
                  </Text>
                </Pressable>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>Không tìm thấy dòng phụ đề phù hợp.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    maxHeight: 520,
    ...nihongoTheme.shadow.card,
  },
  header: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  counter: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  searchInput: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  list: {
    flex: 1,
    maxHeight: 420,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  lineItemActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderLeftWidth: 4,
    borderLeftColor: nihongoTheme.colors.accent,
  },
  timeBadge: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  timeBadgeActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  timeTextActive: {
    color: '#FFFFFF',
  },
  lineText: {
    flex: 1,
    fontSize: 15,
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 22,
    fontWeight: '500',
  },
  lineTextActive: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  emptyView: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: nihongoTheme.colors.textMuted,
  },
});
