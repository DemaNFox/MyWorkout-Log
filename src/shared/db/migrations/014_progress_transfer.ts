import type { Database } from '../types';

export const progressTransferMigration = {
  id: 14,
  async up(db: Database): Promise<void> {
    await db.execute(`CREATE TABLE IF NOT EXISTS app_flags (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`);
    await db.execute(`CREATE TABLE IF NOT EXISTS progress_transfer_baselines (
      id TEXT PRIMARY KEY,
      planned_exercise_id TEXT NOT NULL,
      exercise_id TEXT,
      normalized_name TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      measurement_type TEXT NOT NULL,
      weight_mode TEXT,
      set_index INTEGER NOT NULL,
      actual_weight REAL NOT NULL,
      actual_reps INTEGER NOT NULL,
      actual_duration_sec INTEGER,
      source_workout_set_id TEXT NOT NULL,
      FOREIGN KEY (planned_exercise_id) REFERENCES planned_exercises(id) ON DELETE CASCADE
    );`);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_progress_transfer_planned_exercise ON progress_transfer_baselines(planned_exercise_id);');
  },
};
