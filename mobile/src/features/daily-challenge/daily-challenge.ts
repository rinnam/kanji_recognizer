import type { JlptLevel, VocabularyDto } from '../../../../packages/contracts/src/study';

export const DAILY_CHALLENGE_QUESTION_COUNT = 5;
export const MIN_DAILY_CHALLENGE_DISTINCT_MEANINGS = 4;
export const DAILY_CHALLENGE_RECENT_KEY = 'kanji_nest_daily_challenge_recent_v1';
export const MAX_RECENT_HISTORY = 100;

export interface DailyChallengeQuestion {
  word: VocabularyDto;
  choices: string[];
  correctAnswer: string;
}

export interface BuildDailyChallengeOptions {
  words: readonly VocabularyDto[];
  dueWordIds?: ReadonlySet<string>;
  preferredJlptLevel?: JlptLevel | null;
  recentWordIds?: readonly string[];
  questionCount?: number;
  random?: () => number;
}

export interface DailyChallengeRoundResult {
  questions: DailyChallengeQuestion[];
  nextRecentWordIds: string[];
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function countDistinctMeanings(validWords: readonly VocabularyDto[]): number {
  const meanings = new Set<string>();
  for (const w of validWords) {
    const normalized = normalizeText(w.meaning);
    if (normalized) meanings.add(normalized);
  }
  return meanings.size;
}

/** Fisher–Yates unbiased shuffle returning a new array. */
export function shuffleArray<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function getValidChallengeWords(words: readonly VocabularyDto[]): VocabularyDto[] {
  return words.filter(
    (w) => !w.deletedAt && w.word.trim().length > 0 && w.meaning.trim().length > 0,
  );
}

export function canBuildDailyChallenge(words: readonly VocabularyDto[]): boolean {
  const validWords = getValidChallengeWords(words);
  return countDistinctMeanings(validWords) >= MIN_DAILY_CHALLENGE_DISTINCT_MEANINGS;
}

function appendCandidates(
  target: VocabularyDto[],
  candidates: readonly VocabularyDto[],
  maxToAdd: number,
  targetTotal: number,
  pickedIds: Set<string>,
  pickedWordTexts: Set<string>,
  allowDuplicateWordText: boolean,
): void {
  let added = 0;
  for (const item of candidates) {
    if (target.length >= targetTotal || added >= maxToAdd) break;
    if (pickedIds.has(item.id)) continue;
    const wordKey = item.word.trim();
    if (!allowDuplicateWordText && pickedWordTexts.has(wordKey)) continue;
    target.push(item);
    pickedIds.add(item.id);
    pickedWordTexts.add(wordKey);
    added += 1;
  }
}

function buildDistractors(
  targetWord: VocabularyDto,
  validWords: readonly VocabularyDto[],
  random: () => number,
): string[] {
  const correctNormalized = normalizeText(targetWord.meaning);
  const usedMeanings = new Set<string>([correctNormalized]);
  const distractors: string[] = [];

  const collectFrom = (pool: readonly VocabularyDto[]) => {
    const shuffled = shuffleArray(pool, random);
    for (const candidate of shuffled) {
      if (distractors.length >= 3) break;
      if (candidate.id === targetWord.id) continue;
      const trimmedMeaning = candidate.meaning.trim();
      const normalizedMeaning = trimmedMeaning.toLowerCase();
      if (!normalizedMeaning || usedMeanings.has(normalizedMeaning)) continue;
      usedMeanings.add(normalizedMeaning);
      distractors.push(trimmedMeaning);
    }
  };

  if (targetWord.jlptLevel) {
    collectFrom(validWords.filter((other) => other.jlptLevel === targetWord.jlptLevel));
  }
  if (distractors.length < 3) {
    collectFrom(validWords);
  }

  return distractors;
}

function buildNextRecentHistory(
  recentWordIds: readonly string[],
  validWords: readonly VocabularyDto[],
  chosenIds: readonly string[],
  targetCount: number,
): string[] {
  const validIdSet = new Set(validWords.map((w) => w.id));
  const chosenSet = new Set(chosenIds);
  const dedupedExisting: string[] = [];
  const seenExisting = new Set<string>();

  // Traverse backwards to keep only the most recent occurrence of each valid non-chosen ID
  for (let i = recentWordIds.length - 1; i >= 0; i -= 1) {
    const id = recentWordIds[i];
    if (!validIdSet.has(id) || chosenSet.has(id) || seenExisting.has(id)) continue;
    seenExisting.add(id);
    dedupedExisting.unshift(id);
  }

  const maxHistory =
    validWords.length >= targetCount * 2
      ? Math.min(MAX_RECENT_HISTORY, validWords.length - targetCount)
      : Math.min(targetCount, Math.max(0, validWords.length - 1));

  if (maxHistory <= 0) return [];
  return [...dedupedExisting, ...chosenIds].slice(-maxHistory);
}

/**
 * Builds a fresh, non-repeating daily challenge round drawing across the full library.
 * Prioritizes SRS due/learning words and preferred JLPT level while rotating unseen words
 * first, falling back to oldest-seen words (excluding the previous round) once exhausted.
 */
export function buildDailyChallengeRound(
  options: BuildDailyChallengeOptions,
): DailyChallengeRoundResult {
  const {
    words,
    dueWordIds = new Set<string>(),
    preferredJlptLevel = null,
    recentWordIds = [],
    questionCount = DAILY_CHALLENGE_QUESTION_COUNT,
    random = Math.random,
  } = options;

  const validWords = getValidChallengeWords(words);
  if (countDistinctMeanings(validWords) < MIN_DAILY_CHALLENGE_DISTINCT_MEANINGS) {
    return { questions: [], nextRecentWordIds: [...recentWordIds] };
  }

  const targetCount = Math.min(questionCount, validWords.length);
  if (targetCount <= 0) {
    return { questions: [], nextRecentWordIds: [...recentWordIds] };
  }

  const recentSet = new Set(recentWordIds);
  const unseen = validWords.filter((w) => !recentSet.has(w.id));
  const seen = validWords.filter((w) => recentSet.has(w.id));

  const selected: VocabularyDto[] = [];
  const pickedIds = new Set<string>();
  const pickedWordTexts = new Set<string>();

  if (unseen.length > 0) {
    const dueUnseen = shuffleArray(
      unseen.filter((w) => dueWordIds.has(w.id)),
      random,
    );
    appendCandidates(
      selected,
      dueUnseen,
      Math.min(2, targetCount),
      targetCount,
      pickedIds,
      pickedWordTexts,
      false,
    );

    if (preferredJlptLevel && selected.length < targetCount) {
      const jlptUnseen = shuffleArray(
        unseen.filter((w) => w.jlptLevel === preferredJlptLevel),
        random,
      );
      appendCandidates(
        selected,
        jlptUnseen,
        Math.min(2, targetCount - selected.length),
        targetCount,
        pickedIds,
        pickedWordTexts,
        false,
      );
    }

    if (selected.length < targetCount) {
      const allUnseen = shuffleArray(unseen, random);
      appendCandidates(
        selected,
        allUnseen,
        targetCount - selected.length,
        targetCount,
        pickedIds,
        pickedWordTexts,
        false,
      );
    }
  }

  if (selected.length < targetCount && seen.length > 0) {
    const recentOrder = new Map<string, number>();
    recentWordIds.forEach((id, idx) => {
      recentOrder.set(id, idx);
    });

    const previousRoundSet =
      validWords.length >= targetCount * 2
        ? new Set(recentWordIds.slice(-targetCount))
        : new Set<string>();

    const sortOldestFirst = (list: VocabularyDto[]) =>
      [...list].sort((a, b) => (recentOrder.get(a.id) ?? 0) - (recentOrder.get(b.id) ?? 0));

    const eligibleOldest = sortOldestFirst(seen.filter((w) => !previousRoundSet.has(w.id)));
    const remainingNeeded = targetCount - selected.length;
    const oldestWindowSize = Math.min(eligibleOldest.length, Math.max(remainingNeeded * 2, targetCount));
    const shuffledOldestBucket = shuffleArray(eligibleOldest.slice(0, oldestWindowSize), random);
    const remainingEligible = eligibleOldest.slice(oldestWindowSize);

    appendCandidates(
      selected,
      shuffledOldestBucket,
      targetCount - selected.length,
      targetCount,
      pickedIds,
      pickedWordTexts,
      false,
    );
    appendCandidates(
      selected,
      remainingEligible,
      targetCount - selected.length,
      targetCount,
      pickedIds,
      pickedWordTexts,
      false,
    );

    if (selected.length < targetCount && previousRoundSet.size > 0) {
      const previousPool = shuffleArray(
        seen.filter((w) => previousRoundSet.has(w.id)),
        random,
      );
      appendCandidates(
        selected,
        previousPool,
        targetCount - selected.length,
        targetCount,
        pickedIds,
        pickedWordTexts,
        false,
      );
    }
  }

  // Final fallback only if duplicate word text entries are unavoidable
  if (selected.length < targetCount) {
    appendCandidates(
      selected,
      shuffleArray(unseen, random),
      targetCount - selected.length,
      targetCount,
      pickedIds,
      pickedWordTexts,
      true,
    );
    appendCandidates(
      selected,
      shuffleArray(seen, random),
      targetCount - selected.length,
      targetCount,
      pickedIds,
      pickedWordTexts,
      true,
    );
  }

  const orderedWords = shuffleArray(selected, random);
  const questions: DailyChallengeQuestion[] = orderedWords.map((word) => {
    const correctAnswer = word.meaning.trim();
    const distractors = buildDistractors(word, validWords, random);
    const choices = shuffleArray([correctAnswer, ...distractors], random);
    return {
      word,
      choices,
      correctAnswer,
    };
  });

  const nextRecentWordIds = buildNextRecentHistory(
    recentWordIds,
    validWords,
    questions.map((q) => q.word.id),
    targetCount,
  );

  return { questions, nextRecentWordIds };
}
