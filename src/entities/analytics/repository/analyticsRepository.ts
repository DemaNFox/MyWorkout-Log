import type { Database } from '@shared/db/types';
import { getExerciseById } from '@entities/exercise/model/exerciseCatalog';

import { withTrends } from '../lib/calculateExerciseDynamics';
import { selectExercisePerformance } from '../lib/selectExercisePerformance';
import type {
  AnalyticsExercise,
  ExerciseHistoryRow,
  ExerciseProgressPoint,
} from '../model/types';

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

  async listExercises(): Promise<AnalyticsExercise[]> {
    const activePlanId = await this.getActivePlanId();
    if (!activePlanId) {
      return [];
    }

    const rows = await this.db.getAll<{ exercise_id: string | null; name_snapshot: string }>(
      `SELECT we.exercise_id, MAX(we.name_snapshot) AS name_snapshot
       FROM workout_exercises we
       JOIN workout_sessions ws ON ws.id = we.workout_session_id
       JOIN workout_sets wset ON wset.workout_exercise_id = we.id
       WHERE wset.completed = 1
         AND ws.source_plan_id = ?
         AND (
           we.source_planned_exercise_id IS NULL
           OR EXISTS (SELECT 1 FROM planned_exercises pe WHERE pe.id = we.source_planned_exercise_id)
         )
       GROUP BY COALESCE(we.exercise_id, we.name_snapshot)
       ORDER BY name_snapshot ASC`,
      [activePlanId],
    );
    return rows.map(row => ({
      exerciseId: row.exercise_id,
      name: (row.exercise_id ? getExerciseById(row.exercise_id)?.name : undefined) ?? row.name_snapshot,
    }));
  }

  async getExerciseHistory(exercise: AnalyticsExercise): Promise<ExerciseHistoryRow[]> {
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
       WHERE ((? IS NOT NULL AND we.exercise_id = ?) OR (we.exercise_id IS NULL AND we.name_snapshot = ?))
         AND wset.completed = 1
         AND ws.source_plan_id = ?
         AND (
           we.source_planned_exercise_id IS NULL
           OR EXISTS (SELECT 1 FROM planned_exercises pe WHERE pe.id = we.source_planned_exercise_id)
         )
       ORDER BY ws.started_at ASC, wset.set_index ASC`,
      [exercise.exerciseId, exercise.exerciseId, exercise.name, activePlanId],
    );
    const grouped = new Map<string, { date: string; sets: Array<{ actualWeight: number; actualReps: number }> }>();
    rows.forEach(row => {
      const key = `${row.workoutSessionId}:${row.workoutExerciseId}`;
      const existing = grouped.get(key);
      grouped.set(key, {
        date: row.date ?? '',
        sets: [...(existing?.sets ?? []), { actualWeight: row.actualWeight, actualReps: row.actualReps }],
      });
    });

    return withTrends(
      [...grouped.entries()].flatMap(([key, group]) => {
        const [workoutSessionId, workoutExerciseId] = key.split(':');
        const performance = selectExercisePerformance(group.sets);
        if (!performance || !workoutSessionId || !workoutExerciseId) {
          return [];
        }
        return [
          {
            workoutSessionId,
            workoutExerciseId,
            date: group.date,
            ...performance,
            completedSets: group.sets.length,
          },
        ];
      }),
    );
  }

  async getProgress(exercise: AnalyticsExercise): Promise<ExerciseProgressPoint[]> {
    const history = await this.getExerciseHistory(exercise);
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
