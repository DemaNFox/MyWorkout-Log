import type { Database } from '@shared/db/types';

import { withTrends } from '../lib/calculateExerciseDynamics';
import type { ExerciseHistoryRow, ExerciseProgressPoint } from '../model/types';

type HistorySqlRow = {
  workoutSessionId: string;
  workoutExerciseId: string;
  date: string | null;
  actualWeight: number;
  actualReps: number;
};

type ActivePlanRow = {
  id: string;
};

export class AnalyticsRepository {
  constructor(private readonly db: Database) {}

  async listExerciseNames(): Promise<string[]> {
    const activePlanId = await this.getActivePlanId();
    if (!activePlanId) {
      return [];
    }

    const rows = await this.db.getAll<{ name_snapshot: string }>(
      `SELECT DISTINCT we.name_snapshot
       FROM workout_exercises we
       JOIN workout_sessions ws ON ws.id = we.workout_session_id
       JOIN workout_sets wset ON wset.workout_exercise_id = we.id
       WHERE wset.completed = 1
         AND ws.source_plan_id = ?
         AND (
           we.source_planned_exercise_id IS NULL
           OR EXISTS (SELECT 1 FROM planned_exercises pe WHERE pe.id = we.source_planned_exercise_id)
         )
       ORDER BY we.name_snapshot ASC`,
      [activePlanId],
    );
    return rows.map(row => row.name_snapshot);
  }

  async getExerciseHistory(exerciseName: string): Promise<ExerciseHistoryRow[]> {
    const activePlanId = await this.getActivePlanId();
    if (!activePlanId) {
      return [];
    }

    const rows = await this.db.getAll<HistorySqlRow>(
      `SELECT
         ws.id as workoutSessionId,
         we.id as workoutExerciseId,
         ws.started_at as date,
         wset.actual_weight as actualWeight,
         wset.actual_reps as actualReps
       FROM workout_sessions ws
       JOIN workout_exercises we ON we.workout_session_id = ws.id
       JOIN workout_sets wset ON wset.workout_exercise_id = we.id
       WHERE we.name_snapshot = ?
         AND wset.completed = 1
         AND ws.source_plan_id = ?
         AND (
           we.source_planned_exercise_id IS NULL
           OR EXISTS (SELECT 1 FROM planned_exercises pe WHERE pe.id = we.source_planned_exercise_id)
         )
       ORDER BY ws.started_at ASC, wset.set_index ASC`,
      [exerciseName, activePlanId],
    );
    const grouped = new Map<string, Omit<ExerciseHistoryRow, 'trend'>>();
    rows.forEach(row => {
      const key = `${row.workoutSessionId}:${row.workoutExerciseId}`;
      const existing = grouped.get(key);
      const isBetter =
        !existing ||
        row.actualWeight > existing.bestWeight ||
        (row.actualWeight === existing.bestWeight && row.actualReps > existing.repsAtBestWeight);

      grouped.set(key, {
        workoutSessionId: row.workoutSessionId,
        workoutExerciseId: row.workoutExerciseId,
        date: row.date ?? '',
        bestWeight: isBetter ? row.actualWeight : existing.bestWeight,
        repsAtBestWeight: isBetter ? row.actualReps : existing.repsAtBestWeight,
        completedSets: (existing?.completedSets ?? 0) + 1,
      });
    });

    return withTrends([...grouped.values()]);
  }

  async getProgress(exerciseName: string): Promise<ExerciseProgressPoint[]> {
    const history = await this.getExerciseHistory(exerciseName);
    return history.map(row => ({
      date: row.date,
      weight: row.bestWeight,
      reps: row.repsAtBestWeight,
      trend: row.trend,
    }));
  }

  private async getActivePlanId(): Promise<string | null> {
    const row = await this.db.getFirst<ActivePlanRow>('SELECT id FROM plans WHERE status = ? LIMIT 1', [
      'active',
    ]);
    return row?.id ?? null;
  }
}
