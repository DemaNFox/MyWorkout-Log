import type { Database, ExecuteResult, SqlValue } from '../db/types';

type Row = Record<string, SqlValue>;

const normalize = (sql: string): string => sql.replace(/\s+/g, ' ').trim().toLowerCase();

export class MemoryDatabase implements Database {
  readonly tables = new Map<string, Row[]>();

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<ExecuteResult> {
    const query = normalize(sql);
    if (query.startsWith('create table')) {
      const table = query.match(/create table if not exists ([a-z_]+)/)?.[1];
      if (table) {
        this.tables.set(table, this.tables.get(table) ?? []);
      }
      return { changes: 0 };
    }
    if (query.startsWith('delete from')) {
      let changes = 0;
      const table = query.match(/delete from ([a-z_]+)/)?.[1];
      if (table) {
        const rows = this.tables.get(table) ?? [];
        if (query.includes('where id = ?')) {
          const nextRows = rows.filter(row => row.id !== params[0]);
          changes = rows.length - nextRows.length;
          this.tables.set(table, nextRows);
        } else if (query.includes('where source_plan_id = ?')) {
          const nextRows = rows.filter(row => row.source_plan_id !== params[0]);
          changes = rows.length - nextRows.length;
          this.tables.set(table, nextRows);
        } else if (query.includes('where source_planned_exercise_id = ?')) {
          const nextRows = rows.filter(row => row.source_planned_exercise_id !== params[0]);
          changes = rows.length - nextRows.length;
          this.tables.set(table, nextRows);
        } else if (query.includes('where workout_exercise_id = ?')) {
          const nextRows = rows.filter(row => row.workout_exercise_id !== params[0]);
          changes = rows.length - nextRows.length;
          this.tables.set(table, nextRows);
        } else if (query.includes('where workout_session_id = ?')) {
          const nextRows = rows.filter(row => row.workout_session_id !== params[0]);
          changes = rows.length - nextRows.length;
          this.tables.set(table, nextRows);
        } else {
          changes = rows.length;
          this.tables.set(table, []);
        }
      }
      return { changes };
    }
    if (query.startsWith('insert into')) {
      this.insert(sql, params);
      return { changes: 1 };
    }
    if (query.startsWith('update')) {
      return { changes: this.update(sql, params) };
    }
    return { changes: 0 };
  }

  async getAll<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.select(sql, params) as T[];
  }

  async getFirst<T>(sql: string, params: readonly SqlValue[] = []): Promise<T | null> {
    return (await this.getAll<T>(sql, params))[0] ?? null;
  }

  async transaction(work: () => Promise<void>): Promise<void> {
    await work();
  }

  private insert(sql: string, params: readonly SqlValue[]): void {
    const match = sql.match(/insert into ([a-z_]+)\s*\(([^)]+)\)/i);
    if (!match?.[1] || !match[2]) {
      return;
    }
    const table = match[1];
    const columns = match[2].split(',').map(column => column.trim());
    const row: Row = {};
    columns.forEach((column, index) => {
      row[column] = params[index] ?? null;
    });
    this.tables.set(table, [...(this.tables.get(table) ?? []), row]);
  }

  private update(sql: string, params: readonly SqlValue[]): number {
    const table = sql.match(/update ([a-z_]+)/i)?.[1];
    const setPart = sql.match(/set (.+) where/i)?.[1];
    if (!table || !setPart) {
      return 0;
    }
    const assignments = setPart.split(',').map(part => part.trim().split(' = ')[0]);
    const id = params[assignments.length];
    const rows = this.tables.get(table) ?? [];
    let changes = 0;
    rows.forEach(row => {
      if (row.id !== id) {
        return;
      }
      changes += 1;
      assignments.forEach((column, index) => {
        if (column) {
          row[column] = params[index] ?? null;
        }
      });
    });
    return changes;
  }

  private select(sql: string, params: readonly SqlValue[]): Row[] {
    const query = normalize(sql);
    const table = query.match(/from ([a-z_]+)/)?.[1];
    if (!table) {
      return [];
    }
    let rows = [...(this.tables.get(table) ?? [])];
    if (query.includes('where id = ?')) {
      rows = rows.filter(row => row.id === params[0]);
    }
    if (query.includes('where status = ?')) {
      rows = rows.filter(row => row.status === params[0]);
    }
    if (query.includes('where plan_id = ?')) {
      rows = rows.filter(row => row.plan_id === params[0]);
    }
    if (query.includes('where training_day_id = ?')) {
      rows = rows.filter(row => row.training_day_id === params[0]);
    }
    if (query.includes('where workout_session_id = ?')) {
      rows = rows.filter(row => row.workout_session_id === params[0]);
    }
    if (query.includes('where workout_exercise_id = ?')) {
      rows = rows.filter(row => row.workout_exercise_id === params[0]);
    }
    if (query.includes('where source_plan_id = ?')) {
      rows = rows.filter(row => row.source_plan_id === params[0]);
    }
    if (query.includes('order by sort_order')) {
      rows.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
    }
    if (query.includes('order by started_at desc') || query.includes('order by created_at desc')) {
      rows.sort((a, b) => String(b.started_at ?? b.created_at).localeCompare(String(a.started_at ?? a.created_at)));
    }
    if (query.includes('limit 1')) {
      rows = rows.slice(0, 1);
    }
    return rows;
  }
}
