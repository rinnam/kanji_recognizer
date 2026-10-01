import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { JlptLevel } from '../../../shared/api';

export interface VocabularyFilter {
  folderId: string | null;
  search: string;
  jlpt: JlptLevel | null;
}

function matchesSearch(item: LocalVocabulary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  const haystack = [item.word, item.meaning, item.reading, item.sinoVietnamese];
  return haystack.some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(needle),
  );
}

/** Lọc từ còn sống theo thư mục + JLPT + tìm kiếm; sắp mới nhất trước (createdAt desc). */
export function filterVocabularies(
  vocabularies: LocalVocabulary[],
  filter: VocabularyFilter,
): LocalVocabulary[] {
  return vocabularies
    .filter((item) => item.deletedAt === null)
    .filter((item) =>
      filter.folderId === null ? true : item.folderIds.includes(filter.folderId),
    )
    .filter((item) => (filter.jlpt === null ? true : item.jlptLevel === filter.jlpt))
    .filter((item) => matchesSearch(item, filter.search))
    .sort((a, b) => {
      if (a.createdAt < b.createdAt) return 1;
      if (a.createdAt > b.createdAt) return -1;
      return 0;
    });
}
