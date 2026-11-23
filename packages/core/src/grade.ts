// Normalize and grade answers using the existing web behavior.
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function gradeAnswer(
  userAnswer: string | null | undefined,
  acceptedAnswers: readonly string[],
): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;
  const normalized = normalizeAnswer(userAnswer);
  if (normalized === '') return false;
  return acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalized);
}
