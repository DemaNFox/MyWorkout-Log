export type SqlValue = string | number | null;

export interface Database {
  execute(sql: string, params?: readonly SqlValue[]): Promise<void>;
  getAll<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  transaction(work: () => Promise<void>): Promise<void>;
}
