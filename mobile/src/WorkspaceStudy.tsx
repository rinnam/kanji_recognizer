import { useState } from 'react';
import { ScrollView } from 'react-native';
import type { QuizSessionDto, SrsRating, VocabularyDto } from '../../packages/contracts/src/study';
import { FlashcardStudy } from './FlashcardStudy';
import { TypingQuiz, type QuizSubmission } from './TypingQuiz';
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
  const Component = mode === 'quiz' ? TypingQuiz : FlashcardStudy;
  return <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={!theme.compact}
    contentContainerStyle={[theme.styles.studyShell, mode === 'quiz' && theme.styles.quizShell]}>
    <Component words={words} theme={theme} {...actions} />
  </ScrollView>;
}
