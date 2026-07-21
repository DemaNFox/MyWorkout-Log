import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';
import { ExerciseCatalogRepository } from '@entities/exercise/repository/exerciseCatalogRepository';

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

  it('imports custom exercise metadata before creating a v2 program', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);

    const result = await new ImportService(db).importJson(
      JSON.stringify({
        schemaVersion: 2,
        type: 'workout-programs',
        exportedAt: '2026-07-21T12:00:00.000Z',
        payload: {
          exerciseDictionary: [{
            id: 'custom-landmine-press',
            name: 'Landmine press',
            primaryMuscles: ['shoulders'],
            movementType: 'vertical_press',
            equipmentType: 'barbell',
            defaultMeasurementType: 'weight_reps',
            defaultWeightMode: 'total',
            isCustom: true,
          }],
          programs: [{
            name: 'Custom program',
            days: [{
              name: 'Day',
              order: 1,
              exercises: [{
                name: 'Landmine press',
                exerciseId: 'custom-landmine-press',
                metricType: 'reps',
                measurementType: 'weight_reps',
                weightMode: 'total',
                targetSets: 3,
                targetReps: 8,
                targetWeight: 20,
                note: null,
                order: 1,
              }],
            }],
          }],
        },
      }),
    );

    await expect(new ExerciseCatalogRepository(db).getById('custom-landmine-press')).resolves.toMatchObject({
      name: 'Landmine press',
      equipmentType: 'barbell',
      isCustom: true,
    });
    const day = (await new TrainingDayRepository(db).listDays(result.importedPlanIds[0] ?? ''))[0];
    await expect(new TrainingDayRepository(db).listExercises(day?.id ?? '')).resolves.toEqual([
      expect.objectContaining({ exerciseId: 'custom-landmine-press', weightMode: 'total' }),
    ]);
  });
});
