import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { ExportService } from './exportService';

describe('ExportService', () => {
  it('exports selected programs as one importable JSON envelope', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const days = new TrainingDayRepository(db);

    const firstPlan = await plans.create('Strength');
    const firstDay = await days.createDay(firstPlan.id, 'Push');
    await days.addExercise({
      trainingDayId: firstDay.id,
      name: 'Bench Press',
      targetSets: 4,
      targetReps: 5,
      targetWeight: 80,
      note: null,
    });
    const secondPlan = await plans.create('Pull');

    const exported = await new ExportService(db).exportPrograms([firstPlan.id, secondPlan.id]);

    expect(exported.type).toBe('workout-programs');
    expect(exported.payload.programs).toEqual([
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
        days: [],
      },
    ]);
  });

  it('exports selected program history with sessions and exercise progress', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const days = new TrainingDayRepository(db);
    const workouts = new WorkoutRepository(db);

    const inactivePlan = await plans.create('Strength');
    const activePlan = await plans.create('Hypertrophy');
    await plans.activate(activePlan.id);
    const day = await days.createDay(inactivePlan.id, 'Push');
    const plannedExercise = await days.addExercise({
      trainingDayId: day.id,
      name: 'Bench Press',
      targetSets: 2,
      targetReps: 5,
      targetWeight: 80,
    });

    const firstSession = await workouts.createSession({
      sourcePlanId: inactivePlan.id,
      sourceTrainingDayId: day.id,
      planNameSnapshot: inactivePlan.name,
      trainingDayNameSnapshot: day.name,
    });
    const firstExercise = await workouts.addExercise({
      workoutSessionId: firstSession.id,
      sourcePlannedExerciseId: plannedExercise.id,
      nameSnapshot: plannedExercise.name,
      noteSnapshot: null,
      order: 1,
    });
    const firstSet = await workouts.addSet({
      workoutExerciseId: firstExercise.id,
      setIndex: 1,
      targetWeight: 80,
      targetReps: 5,
      actualWeight: 80,
      actualReps: 5,
    });
    await workouts.completeSet(firstSet.id, 80, 5);

    const secondSession = await workouts.createSession({
      sourcePlanId: inactivePlan.id,
      sourceTrainingDayId: day.id,
      planNameSnapshot: inactivePlan.name,
      trainingDayNameSnapshot: day.name,
    });
    const secondExercise = await workouts.addExercise({
      workoutSessionId: secondSession.id,
      sourcePlannedExerciseId: plannedExercise.id,
      nameSnapshot: plannedExercise.name,
      noteSnapshot: null,
      order: 1,
    });
    const secondSet = await workouts.addSet({
      workoutExerciseId: secondExercise.id,
      setIndex: 1,
      targetWeight: 82.5,
      targetReps: 5,
      actualWeight: 82.5,
      actualReps: 5,
    });
    await workouts.completeSet(secondSet.id, 82.5, 5);

    const exported = await new ExportService(db).exportProgramHistory([inactivePlan.id]);
    const exportedProgram = exported.payload.programs[0];

    expect(exported.type).toBe('program-history');
    expect(exported.payload.programs).toHaveLength(1);
    expect(exportedProgram?.plan).toEqual({
      id: inactivePlan.id,
      name: 'Strength',
      status: 'inactive',
    });
    expect(exportedProgram?.sessions).toHaveLength(2);
    expect(
      exportedProgram?.sessions
        .flatMap(session => session.exercises)
        .flatMap(exercise => exercise.sets)
        .some(set => set.actualWeight === 82.5 && set.actualReps === 5 && set.completed),
    ).toBe(true);
    expect(exportedProgram?.exerciseProgress).toEqual([
      {
        exerciseName: 'Bench Press',
        bestResult: {
          weight: 82.5,
          reps: 5,
          date: expect.any(String),
        },
        history: [
          expect.objectContaining({
            bestWeight: 80,
            repsAtBestWeight: 5,
            trend: 'none',
          }),
          expect.objectContaining({
            bestWeight: 82.5,
            repsAtBestWeight: 5,
            trend: 'up',
          }),
        ],
      },
    ]);
  });
});
