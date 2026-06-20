import * as SQLite from 'expo-sqlite';

import type { Database, ExecuteResult, SqlValue } from '../types';

type ExpoDb = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

export class ExpoDatabase implements Database {
  constructor(private readonly db: ExpoDb) {}

  static async open(name = 'workout_logger.db'): Promise<ExpoDatabase> {
    const db = await SQLite.openDatabaseAsync(name);
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return new ExpoDatabase(db);
  }

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<ExecuteResult> {
    const result = await this.db.runAsync(sql, [...params]);
    return { changes: result.changes };
  }

  async getAll<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, [...params]);
  }

  async getFirst<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
    const row = await this.db.getFirstAsync<T>(sql, [...params]);
    return row ?? null;
  }

  async transaction(work: () => Promise<void>): Promise<void> {
    await this.db.withTransactionAsync(work);
  }
}
