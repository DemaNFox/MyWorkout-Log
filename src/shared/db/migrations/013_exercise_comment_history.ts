import type { Database } from '../types';

export const exerciseCommentHistoryMigration = {
  id: 13,
  async up(db: Database): Promise<void> {
    await db.execute(`CREATE TABLE IF NOT EXISTS exercise_comment_entries (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`);
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_exercise_comment_entries_exercise_id_created_at ON exercise_comment_entries(exercise_id, created_at DESC);',
    );
    await db.execute(`INSERT INTO exercise_comment_entries (id, exercise_id, text, created_at)
      SELECT 'legacy-' || pe.id, pe.exercise_id, TRIM(pe.note), pe.updated_at
      FROM planned_exercises pe
      WHERE pe.exercise_id IS NOT NULL
        AND TRIM(COALESCE(pe.note, '')) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM planned_exercises newer
          WHERE newer.exercise_id = pe.exercise_id
            AND TRIM(COALESCE(newer.note, '')) <> ''
            AND newer.updated_at > pe.updated_at
        );`);
  },
};
