import type { Database } from '../types';

export const timedExercisesMigration = {
  id: 8,
  async up(db: Database): Promise<void> {
    await db.execute("ALTER TABLE planned_exercises ADD COLUMN metric_type TEXT NOT NULL DEFAULT 'reps'");
    await db.execute('ALTER TABLE planned_exercises ADD COLUMN target_duration_sec INTEGER');
    await db.execute("ALTER TABLE workout_exercises ADD COLUMN metric_type TEXT NOT NULL DEFAULT 'reps'");
    await db.execute('ALTER TABLE workout_sets ADD COLUMN target_duration_sec INTEGER');
    await db.execute('ALTER TABLE workout_sets ADD COLUMN actual_duration_sec INTEGER');
  },
};
