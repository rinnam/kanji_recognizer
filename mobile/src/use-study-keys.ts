export type StudyKey = { key: string; typing: boolean; button: boolean };
export function useStudyKeys(_handle: (event: StudyKey) => boolean): void {}
