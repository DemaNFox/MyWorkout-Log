import type { Database } from '../types';

export const workoutSetRestTrackingMigration = {
  id: 4,
  async up(db: Database): Promise<void> {
    await db.execute('ALTER TABLE workout_sets ADD COLUMN rest_started_at TEXT');
    await db.execute('ALTER TABLE workout_sets ADD COLUMN rest_finished_at TEXT');
    await db.execute('ALTER TABLE workout_sets ADD COLUMN rest_duration_sec INTEGER');
  },
};
