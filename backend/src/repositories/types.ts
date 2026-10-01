import type { Kysely, Transaction } from 'kysely';
import type { DB } from '../types/database.js';

/**
 * Executor dùng cho repository: pool chính (Kysely) HOẶC transaction (Transaction).
 * Vì Transaction<DB> kế thừa Kysely<DB> nên mọi query builder dùng chung được.
 */
export type Executor = Kysely<DB> | Transaction<DB>;
