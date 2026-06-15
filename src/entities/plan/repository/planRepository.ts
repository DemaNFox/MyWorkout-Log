import type { Database } from '@shared/db/types';
import { assertNonEmpty } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';
import { nowIso } from '@shared/lib/date';

import type { Plan } from '../model/types';

type PlanRow = {
  id: string;
  name: string;
  status: Plan['status'];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

const toPlan = (row: PlanRow): Plan => ({
  id: row.id,
  name: row.name,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export class PlanRepository {
  constructor(private readonly db: Database) {}

  async create(name: string): Promise<Plan> {
    assertNonEmpty(name, 'Plan name is required');
    const timestamp = nowIso();
    const plan: Plan = {
      id: createId(),
      name: name.trim(),
      status: 'inactive',
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
    };
    await this.db.execute(
      `INSERT INTO plans (id, name, status, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plan.id, plan.name, plan.status, plan.createdAt, plan.updatedAt, plan.archivedAt],
    );
    return plan;
  }

  async list(): Promise<Plan[]> {
    const rows = await this.db.getAll<PlanRow>('SELECT * FROM plans ORDER BY created_at DESC');
    return rows.map(toPlan);
  }

  async getById(id: string): Promise<Plan | null> {
    const row = await this.db.getFirst<PlanRow>('SELECT * FROM plans WHERE id = ?', [id]);
    return row ? toPlan(row) : null;
  }

  async getActive(): Promise<Plan | null> {
    const row = await this.db.getFirst<PlanRow>('SELECT * FROM plans WHERE status = ? LIMIT 1', [
      'active',
    ]);
    return row ? toPlan(row) : null;
  }

  async activate(id: string): Promise<void> {
    const timestamp = nowIso();
    await this.db.transaction(async () => {
      const plans = await this.list();
      for (const plan of plans) {
        if (plan.status === 'active') {
          await this.db.execute('UPDATE plans SET status = ?, updated_at = ? WHERE id = ?', [
            'inactive',
            timestamp,
            plan.id,
          ]);
        }
      }
      await this.db.execute('UPDATE plans SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?', [
        'active',
        null,
        timestamp,
        id,
      ]);
    });
  }

  async archive(id: string): Promise<void> {
    const timestamp = nowIso();
    await this.db.execute('UPDATE plans SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?', [
      'archived',
      timestamp,
      timestamp,
      id,
    ]);
  }

  async rename(id: string, name: string): Promise<void> {
    assertNonEmpty(name, 'Plan name is required');
    await this.db.execute('UPDATE plans SET name = ?, updated_at = ? WHERE id = ?', [
      name.trim(),
      nowIso(),
      id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.execute('DELETE FROM workout_sessions WHERE source_plan_id = ?', [id]);
      await this.db.execute('DELETE FROM plans WHERE id = ?', [id]);
    });
  }
}
