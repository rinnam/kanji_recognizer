import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import type { QuizSessionDto, SrsRating, VocabularyDto } from '../../packages/contracts/src/study';
import { FlashcardStudy } from './FlashcardStudy';
import { TypingQuiz, type QuizSubmission } from './TypingQuiz';
import { applyScope, type ScopeSelection } from './study-model';
import { Control } from './WorkspaceButton';
import type { WorkspaceTheme } from './workspace-theme';

export interface StudyActions {
  onEdit?: (word: VocabularyDto) => void;
  onRate?: (word: VocabularyDto, rating: SrsRating) => Promise<void>;
  onReset?: (words: VocabularyDto[]) => Promise<void>;
  onSaveQuiz?: (submission: QuizSubmission) => Promise<QuizSessionDto>;
}

export function WorkspaceStudy({ mode, words, theme, ...actions }: StudyActions & {
  mode: 'flashcard' | 'quiz'; words: VocabularyDto[]; theme: WorkspaceTheme;
}) {
  const [scope, setScope] = useState<ScopeSelection>({ mode: 'all', n: 30, seed: 0 });
  const [number, setNumber] = useState('30');
  const selected = applyScope(words, scope);
  const Component = mode === 'quiz' ? TypingQuiz : FlashcardStudy;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[theme.styles.studyCard, { width: '100%', maxWidth: 1100, alignSelf: 'center' }]}>
    <View style={theme.styles.actions}>
      <Text style={theme.styles.muted}>Phạm vi</Text>
      {([['all','Tất cả'],['first',scope.n + ' từ đầu'],['random','Random']] as const).map(([id,label]) =>
        <Control key={id} theme={theme} label={label} selected={id === scope.mode}
          onPress={() => setScope(s => ({ ...s, mode: id, seed: id === 'random' ? s.seed + 1 : s.seed }))} />)}
      <TextInput accessibilityLabel="Số thẻ N" keyboardType="number-pad" value={number}
        onChangeText={v => setNumber(v.replace(/\D/g,''))} onBlur={() => {
          const n = Math.max(1,Math.min(words.length,Number(number) || 1)); setNumber(String(n)); setScope(s => ({ ...s,n }));
        }} style={[theme.styles.input,{ width: 56 }]} />
      <Text style={theme.styles.pill}>{selected.length}/{words.length}</Text>
    </View>
    <Component key={scope.mode + '-' + (scope.mode === 'all' ? '' : scope.n + '-' + scope.seed)}
      words={selected} theme={theme} {...actions} />
  </ScrollView>;
}
