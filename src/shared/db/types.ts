export type SqlValue = string | number | null;

export interface ExecuteResult {
  changes: number;
}

export interface Database {
  execute(sql: string, params?: readonly SqlValue[]): Promise<ExecuteResult>;
  getAll<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  transaction(work: () => Promise<void>): Promise<void>;
}
