/**
 * ID client-style: `<prefix>_<timestamp>_<base36rand>`.
 * Khớp quy ước LocalFolder/LocalVocabulary ('folder_<ts>_<rand>', 'vocab_<ts>_<rand>').
 */
function randomBase36(): string {
  // Hai mẩu random để giảm xác suất trùng khi tạo nhiều ID trong cùng ms.
  const a = Math.random().toString(36).slice(2, 8);
  const b = Math.random().toString(36).slice(2, 6);
  return `${a}${b}`;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBase36()}`;
}

export function newFolderId(): string {
  return newId('folder');
}

export function newVocabId(): string {
  return newId('vocab');
}
