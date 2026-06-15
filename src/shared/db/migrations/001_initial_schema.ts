import type { Database } from '../types';

const statements = [
  `CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS training_days (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS planned_exercises (
    id TEXT PRIMARY KEY,
    training_day_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps INTEGER NOT NULL,
    target_weight REAL NOT NULL,
    note TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (training_day_id) REFERENCES training_days(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    source_plan_id TEXT,
    source_training_day_id TEXT,
    plan_name_snapshot TEXT,
    training_day_name_snapshot TEXT,
    status TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    duration_sec INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    workout_session_id TEXT NOT NULL,
    source_planned_exercise_id TEXT,
    name_snapshot TEXT NOT NULL,
    note_snapshot TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    target_weight REAL,
    target_reps INTEGER,
    actual_weight REAL NOT NULL,
    actual_reps INTEGER NOT NULL,
    completed INTEGER NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    weight_unit TEXT NOT NULL,
    default_rest_sec INTEGER NOT NULL,
    date_format TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
];

export const initialSchemaMigration = {
  id: 1,
  async up(db: Database): Promise<void> {
    for (const statement of statements) {
      await db.execute(statement);
    }
  },
};
