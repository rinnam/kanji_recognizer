/**
 * Sinh id phía client theo quy ước CONTEXT.md:
 *  - vocabulary: 'vocab_<timestamp>_<random>'
 *  - folder:     'folder_<timestamp>_<random>'
 * Client là nơi sinh id (local-first) rồi đẩy nguyên id lên server khi sync.
 */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function newId(prefix: 'vocab' | 'folder'): string {
  return `${prefix}_${Date.now().toString(36)}_${randomSuffix()}`;
}

export function newVocabId(): string {
  return newId('vocab');
}

export function newFolderId(): string {
  return newId('folder');
}
