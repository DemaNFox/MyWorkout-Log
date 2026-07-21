import type { Database } from '../types';

const statements = [
  'ALTER TABLE planned_exercises ADD COLUMN exercise_id TEXT;',
  'ALTER TABLE planned_exercises ADD COLUMN measurement_type TEXT NOT NULL DEFAULT \'weight_reps\';',
  'ALTER TABLE planned_exercises ADD COLUMN weight_mode TEXT;',
  'ALTER TABLE workout_exercises ADD COLUMN exercise_id TEXT;',
  'ALTER TABLE workout_exercises ADD COLUMN measurement_type TEXT NOT NULL DEFAULT \'weight_reps\';',
  'ALTER TABLE workout_exercises ADD COLUMN weight_mode TEXT;',
  'ALTER TABLE workout_sets ADD COLUMN effort TEXT;',
  'ALTER TABLE workout_sessions ADD COLUMN feedback_energy TEXT;',
  'ALTER TABLE workout_sessions ADD COLUMN feedback_difficulty TEXT;',
  'ALTER TABLE workout_sessions ADD COLUMN feedback_note TEXT;',
  `CREATE TABLE IF NOT EXISTS body_metrics (
    id TEXT PRIMARY KEY,
    measured_at TEXT NOT NULL,
    body_weight REAL,
    waist REAL,
    chest REAL,
    hips REAL,
    arm REAL,
    thigh REAL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  'CREATE INDEX IF NOT EXISTS idx_planned_exercises_exercise_id ON planned_exercises(exercise_id);',
  'CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);',
  'CREATE INDEX IF NOT EXISTS idx_body_metrics_measured_at ON body_metrics(measured_at);',
];

export const exerciseDataModelMigration = {
  id: 11,
  async up(db: Database): Promise<void> {
    for (const statement of statements) {
      await db.execute(statement);
    }
    await db.execute(
      "UPDATE planned_exercises SET measurement_type = 'duration', weight_mode = NULL WHERE metric_type = 'duration'",
    );
    await db.execute(
      "UPDATE workout_exercises SET measurement_type = 'duration', weight_mode = NULL WHERE metric_type = 'duration'",
    );
  },
};
