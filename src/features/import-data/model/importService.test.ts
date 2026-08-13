import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';
import { ExerciseCatalogRepository } from '@entities/exercise/repository/exerciseCatalogRepository';
import { ExerciseCommentRepository } from '@entities/exercise-comment/repository/exerciseCommentRepository';

import { ImportService } from './importService';

describe('ImportService', () => {
  it('imports a standalone exercise comment log without duplicates', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const raw = JSON.stringify({
      schemaVersion: 2,
      type: 'exercise-comments',
      exportedAt: '2026-08-13T10:00:00.000Z',
      payload: {
        comments: [{
          id: 'comment-1',
          exerciseId: 'back-squat',
          text: 'Keep the chest up',
          createdAt: '2026-08-13T09:00:00.000Z',
        }],
        exerciseDictionary: [],
      },
    });

    await expect(new ImportService(db).importJson(raw)).resolves.toEqual({
      importedPlanIds: [],
      importedCommentCount: 1,
    });
    await expect(new ImportService(db).importJson(raw)).resolves.toEqual({
      importedPlanIds: [],
      importedCommentCount: 0,
    });
    await expect(new ExerciseCommentRepository(db).list('back-squat')).resolves.toHaveLength(1);
  });

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
                      name: 'Barbell Row',
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

  it('rejects an unknown exercise without metadata and rolls back the whole import', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);

    await expect(
      new ImportService(db).importJson(
        JSON.stringify({
          schemaVersion: 2,
          type: 'workout-programs',
          exportedAt: '2026-07-21T12:00:00.000Z',
          payload: {
            programs: [{
              name: 'Invalid program',
              days: [{
                name: 'Day',
                order: 1,
                exercises: [{
                  name: 'Unknown exercise',
                  exerciseId: 'unknown-exercise',
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
      ),
    ).rejects.toMatchObject({ code: 'import.exerciseMissingMetadata' });
    await expect(new PlanRepository(db).list()).resolves.toEqual([]);
  });

  it('imports unknown full metadata as a custom exercise even without an isCustom flag', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);

    await new ImportService(db).importJson(
      JSON.stringify({
        schemaVersion: 2,
        type: 'workout-programs',
        exportedAt: '2026-07-21T12:00:00.000Z',
        payload: {
          exerciseDictionary: [{
            id: 'partner-resisted-row',
            name: 'Partner resisted row',
            primaryMuscles: ['back'],
            movementType: 'row',
            equipmentType: 'other',
            defaultMeasurementType: 'assisted_reps',
          }],
          programs: [{
            name: 'Imported program',
            days: [{
              name: 'Day',
              order: 1,
              exercises: [{
                name: 'Partner resisted row',
                exerciseId: 'partner-resisted-row',
                metricType: 'reps',
                measurementType: 'assisted_reps',
                weightMode: null,
                targetSets: 3,
                targetReps: 10,
                targetWeight: 0,
                note: null,
                order: 1,
              }],
            }],
          }],
        },
      }),
    );

    await expect(new ExerciseCatalogRepository(db).getById('partner-resisted-row')).resolves.toMatchObject({
      isCustom: true,
      equipmentType: 'other',
    });
  });
});
