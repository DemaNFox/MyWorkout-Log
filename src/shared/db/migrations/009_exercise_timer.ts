import type { Database } from '../types';

export const exerciseTimerMigration = {
  id: 9,
  async up(db: Database): Promise<void> {
    await db.execute('ALTER TABLE workout_sets ADD COLUMN exercise_started_at TEXT');
  },
};
