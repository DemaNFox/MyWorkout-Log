import type { Database } from '../types';

export const customExercisesMigration = {
  id: 12,
  async up(db: Database): Promise<void> {
    await db.execute(`CREATE TABLE IF NOT EXISTS custom_exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      equipment_type TEXT NOT NULL,
      primary_muscle TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      default_measurement_type TEXT NOT NULL,
      default_weight_mode TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    await db.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_exercises_name ON custom_exercises(name COLLATE NOCASE);',
    );
  },
};
