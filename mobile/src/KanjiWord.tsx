import { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { lookupKanji } from '../../frontend/src/entities/kanji/model/kanji-dict';
import { mapSinoForKanjiIndex, segmentJapaneseWord } from '../../frontend/src/entities/kanji/model/kanji-utils';
import type { VocabularyDto } from '../../packages/contracts/src/study';
import { Control } from './WorkspaceButton';
import type { WorkspaceTheme } from './workspace-theme';

export function KanjiWord({ word, theme }: { word: VocabularyDto; theme: WorkspaceTheme }) {
  const [detail, setDetail] = useState<ReturnType<typeof lookupKanji>>(null);
  const segments = segmentJapaneseWord(word.word);
  const count = segments.filter(s => s.isKanji).length;
  let position = 0;
  return <>
    <Text style={[theme.styles.title, { fontSize: 36, textAlign: 'center' }]}>
      {segments.map((s, i) => {
        if (!s.isKanji) return s.text;
        const sino = mapSinoForKanjiIndex(word.sinoVietnamese, position++, count);
        return <Text key={i} accessibilityRole="button" accessibilityLabel={`Tra chữ ${s.text}`}
          style={{ textDecorationLine: 'underline', textDecorationColor: theme.colors.border }}
          onPress={event => { event.stopPropagation(); setDetail(lookupKanji(s.text, sino, word.meaning)); }}>{s.text}</Text>;
      })}
    </Text>
    {detail && <Modal transparent onRequestClose={() => setDetail(null)}>
      <View style={theme.styles.overlay}><View accessibilityViewIsModal style={theme.styles.studyCard}>
        <Text style={theme.styles.title}>{detail.character} · {detail.sinoVietnamese}</Text>
        <Text style={theme.styles.field}>{detail.meaning}</Text>
        {detail.onyomi.length > 0 && <Text style={theme.styles.field}>Âm On · {detail.onyomi.join('、')}</Text>}
        {detail.kunyomi.length > 0 && <Text style={theme.styles.field}>Âm Kun · {detail.kunyomi.join('、')}</Text>}
        <Text style={theme.styles.muted}>{[detail.jlptLevel, detail.strokeCount && `${detail.strokeCount} nét`, detail.radical].filter(Boolean).join(' · ')}</Text>
        <Control theme={theme} label="Đóng" onPress={() => setDetail(null)} />
      </View></View>
    </Modal>}
  </>;
}
