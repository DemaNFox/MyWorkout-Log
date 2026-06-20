import type { Database } from '../types';

export const workoutSetRestTargetMigration = {
  id: 6,
  async up(db: Database): Promise<void> {
    await db.execute('ALTER TABLE workout_sets ADD COLUMN rest_target_sec INTEGER');
  },
};
