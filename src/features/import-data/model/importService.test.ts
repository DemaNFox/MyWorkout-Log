import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { ImportService } from './importService';

describe('ImportService', () => {
  it('imports multiple programs from one JSON file', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);

    const result = await new ImportService(db).importJson(
      JSON.stringify({
        schemaVersion: 1,
        type: 'workout-programs',
        exportedAt: '2026-06-20T12:00:00.000Z',
        payload: {
          programs: [
            {
              name: 'Strength',
              days: [
                {
                  name: 'Push',
                  order: 1,
                  exercises: [
                    {
                      name: 'Bench Press',
                      targetSets: 4,
                      targetReps: 5,
                      targetWeight: 80,
                      note: null,
                      order: 1,
                    },
                  ],
                },
              ],
            },
            {
              name: 'Pull',
              days: [
                {
                  name: 'Back',
                  order: 1,
                  exercises: [
                    {
                      name: 'Row',
                      targetSets: 3,
                      targetReps: 8,
                      targetWeight: 60,
                      note: 'Strict form',
                      order: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    const plans = await new PlanRepository(db).list();
    const firstPlanDay = await new TrainingDayRepository(db).listDays(result.importedPlanIds[0] ?? '');
    const firstDayExercises = await new TrainingDayRepository(db).listExercises(firstPlanDay[0]?.id ?? '');

    expect(result.importedPlanIds).toHaveLength(2);
    expect(plans.map(plan => plan.name).sort()).toEqual(['Pull', 'Strength']);
    expect(firstPlanDay[0]?.name).toBe('Push');
    expect(firstDayExercises[0]).toMatchObject({
      name: 'Bench Press',
      targetSets: 4,
      targetReps: 5,
      targetWeight: 80,
    });
  });
});
