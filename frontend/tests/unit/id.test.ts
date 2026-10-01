import { describe, expect, it } from 'vitest';
import { newFolderId, newVocabId } from '../../src/shared/lib';

/** Unit test THUẦN cho sinh id client (quy ước CONTEXT.md). */
describe('id generators', () => {
  it('newVocabId có tiền tố vocab_ và duy nhất', () => {
    const a = newVocabId();
    const b = newVocabId();
    expect(a.startsWith('vocab_')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('newFolderId có tiền tố folder_', () => {
    expect(newFolderId().startsWith('folder_')).toBe(true);
  });
});
