import { z } from 'zod';
import { LIBRARY_ITEM_KINDS, LIBRARY_ITEM_SORTS, type LibraryItemCursor } from '../models/library.js';

function decodeCursor(value: string): LibraryItemCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    const cursor = z.object({
      sort: z.enum(LIBRARY_ITEM_SORTS),
      value: z.string().min(1),
      id: z.uuid()
    }).parse(parsed);
    if (cursor.sort.startsWith('saved-') && !z.iso.datetime().safeParse(cursor.value).success) {
      throw new Error('Invalid saved-date cursor');
    }
    return cursor;
  } catch {
    throw new Error('Invalid library cursor');
  }
}

export const libraryQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  kind: z.enum(LIBRARY_ITEM_KINDS).optional(),
  deckId: z.uuid().optional(),
  jlptLevel: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(LIBRARY_ITEM_SORTS).default('saved-desc'),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  cursor: z.string().min(1).max(2000).optional()
}).transform((value, context) => {
  if (!value.cursor) return value;
  try {
    const cursor = decodeCursor(value.cursor);
    if (cursor.sort !== value.sort) {
      context.addIssue({ code: 'custom', message: 'Cursor does not match the requested sort', path: ['cursor'] });
      return z.NEVER;
    }
    return { ...value, cursor };
  } catch {
    context.addIssue({ code: 'custom', message: 'Invalid library cursor', path: ['cursor'] });
    return z.NEVER;
  }
});

export const uuidParamSchema = z.object({ id: z.uuid() });
export const deckIdParamSchema = z.object({ deckId: z.uuid() });

export const saveItemSchema = z.object({
  contentItemId: z.uuid(),
  deckId: z.uuid().optional(),
  sourceKind: z.enum(['import', 'manual', 'reference']).default('manual'),
  sourceRef: z.string().trim().min(1).max(1000).optional(),
  sourceContext: z.record(z.string(), z.unknown()).optional()
});

export const createDeckSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  parentId: z.uuid().nullable().optional()
});

export const updateDeckSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  parentId: z.uuid().nullable().optional(),
  expectedVersion: z.coerce.bigint().positive()
}).refine((value) => value.name !== undefined || value.description !== undefined || value.parentId !== undefined, {
  message: 'At least one deck field must be supplied'
});

export const rebalanceDecksSchema = z.object({
  expectedLibraryVersion: z.coerce.bigint().positive(),
  placements: z.array(z.object({
    deckId: z.uuid(),
    parentId: z.uuid().nullable(),
    sortPosition: z.coerce.bigint().positive()
  })).min(1).superRefine((items, context) => {
    const ids = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.deckId)) context.addIssue({ code: 'custom', message: 'Duplicate deckId', path: [index, 'deckId'] });
      ids.add(item.deckId);
    }
  })
});

export const deleteDeckSchema = z.object({ expectedVersion: z.coerce.bigint().positive() });
