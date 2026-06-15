import type { Database } from '../types';

const statements = [
  `DELETE FROM workout_exercises
   WHERE source_planned_exercise_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM planned_exercises pe WHERE pe.id = workout_exercises.source_planned_exercise_id
     );`,
  `DELETE FROM workout_sessions
   WHERE source_plan_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM plans p WHERE p.id = workout_sessions.source_plan_id
     );`,
];

export const pruneOrphanWorkoutHistoryMigration = {
  id: 3,
  async up(db: Database): Promise<void> {
    for (const statement of statements) {
      await db.execute(statement);
    }
  },
};
