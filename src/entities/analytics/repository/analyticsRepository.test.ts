import type { Database, ExecuteResult, SqlValue } from '@shared/db/types';

import type { AnalyticsExercise } from '../model/types';
import { AnalyticsRepository } from './analyticsRepository';

class AnalyticsDatabaseStub implements Database {
  historyParams: readonly SqlValue[] = [];

  async execute(): Promise<ExecuteResult> {
    return { changes: 0 };
  }

  async getAll<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    if (sql.includes('GROUP BY COALESCE')) {
      return [
        {
          exercise_id: 'custom-landmine-press',
          name_snapshot: 'Landmine press',
          metric_type: 'reps',
        },
      ] as T[];
    }
    if (sql.includes('ORDER BY ws.started_at ASC')) {
      this.historyParams = params;
      if (params[0] !== 'custom-landmine-press') {
        return [];
      }
      return [
        {
          workoutSessionId: 'session-1',
          workoutExerciseId: 'workout-exercise-1',
          date: '2026-07-22T18:00:00.000Z',
          actualWeight: 30,
          actualReps: 10,
        },
      ] as T[];
    }
    return [];
  }

  async getFirst<T>(): Promise<T | null> {
    return { id: 'active-plan' } as T;
  }

  async transaction(work: () => Promise<void>): Promise<void> {
    await work();
  }
}

describe('AnalyticsRepository', () => {
  it('loads custom exercise history by its stable database ID', async () => {
    const db = new AnalyticsDatabaseStub();
    const repository = new AnalyticsRepository(db);

    const exercises = await repository.listExercises();
    const exercise = exercises[0];

    expect(exercise).toEqual({
      exerciseId: 'custom-landmine-press',
      name: 'Landmine press',
      metricType: 'reps',
    });
    await expect(repository.getExerciseHistory(exercise as AnalyticsExercise)).resolves.toEqual([
      expect.objectContaining({
        workoutSessionId: 'session-1',
        bestWeight: 30,
        repsAtBestWeight: 10,
      }),
    ]);
    expect(db.historyParams.slice(0, 3)).toEqual([
      'custom-landmine-press',
      'custom-landmine-press',
      'Landmine press',
    ]);
  });
});
