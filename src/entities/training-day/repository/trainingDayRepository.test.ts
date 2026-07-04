import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';

import { TrainingDayRepository } from './trainingDayRepository';

describe('TrainingDayRepository', () => {
  it('updates an existing exercise type and parameters', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const trainingDays = new TrainingDayRepository(db);
    const plan = await plans.create('Program');
    const day = await trainingDays.createDay(plan.id, 'Core');
    const exercise = await trainingDays.addExercise({
      trainingDayId: day.id,
      name: 'Plank',
      targetSets: 3,
      targetReps: 10,
      targetWeight: 0,
    });

    await trainingDays.updateExercise({
      id: exercise.id,
      name: 'Front plank',
      metricType: 'duration',
      targetSets: 4,
      targetReps: 0,
      targetWeight: 0,
      targetDurationSec: 75,
      note: 'Keep hips level',
    });

    await expect(trainingDays.listExercises(day.id)).resolves.toEqual([
      expect.objectContaining({
        id: exercise.id,
        name: 'Front plank',
        metricType: 'duration',
        targetSets: 4,
        targetDurationSec: 75,
        note: 'Keep hips level',
      }),
    ]);
  });

  it('deletes workout exercises created from the removed planned exercise', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const trainingDays = new TrainingDayRepository(db);
    const workouts = new WorkoutRepository(db);

    const plan = await plans.create('Program');
    const day = await trainingDays.createDay(plan.id, 'Day');
    const plannedExercise = await trainingDays.addExercise({
      trainingDayId: day.id,
      name: 'Bench press',
      targetSets: 3,
      targetReps: 8,
      targetWeight: 80,
    });
    const session = await workouts.createSession({
      sourcePlanId: plan.id,
      sourceTrainingDayId: day.id,
      planNameSnapshot: plan.name,
      trainingDayNameSnapshot: day.name,
    });
    await workouts.addExercise({
      workoutSessionId: session.id,
      sourcePlannedExerciseId: plannedExercise.id,
      nameSnapshot: plannedExercise.name,
      noteSnapshot: plannedExercise.note,
      order: plannedExercise.order,
    });

    await trainingDays.deleteExercise(plannedExercise.id);

    expect(db.tables.get('workout_exercises')).toEqual([]);
  });

  it('shares an exercise comment across days in the same plan', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const trainingDays = new TrainingDayRepository(db);
    const plan = await plans.create('Program');
    const pushDay = await trainingDays.createDay(plan.id, 'Push A');
    const secondPushDay = await trainingDays.createDay(plan.id, 'Push B');

    await trainingDays.addExercise({
      trainingDayId: pushDay.id,
      name: 'Bench press',
      targetSets: 3,
      targetReps: 8,
      targetWeight: 80,
      note: 'Keep shoulder blades tight',
    });
    const duplicate = await trainingDays.addExercise({
      trainingDayId: secondPushDay.id,
      name: '  BENCH   PRESS ',
      targetSets: 4,
      targetReps: 6,
      targetWeight: 85,
    });

    expect(duplicate.note).toBe('Keep shoulder blades tight');

    await trainingDays.updateExercise({
      id: duplicate.id,
      name: 'Paused bench press',
      metricType: 'reps',
      targetSets: 4,
      targetReps: 5,
      targetWeight: 90,
      targetDurationSec: null,
      note: 'Pause on the chest',
    });

    await expect(trainingDays.listExercises(pushDay.id)).resolves.toEqual([
      expect.objectContaining({
        name: 'Paused bench press',
        note: 'Pause on the chest',
      }),
    ]);
    await expect(trainingDays.listExercises(secondPushDay.id)).resolves.toEqual([
      expect.objectContaining({
        name: 'Paused bench press',
        note: 'Pause on the chest',
      }),
    ]);
  });

  it('applies plan edits to pending sets in an open workout', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const trainingDays = new TrainingDayRepository(db);
    const workouts = new WorkoutRepository(db);
    const plan = await plans.create('Program');
    const day = await trainingDays.createDay(plan.id, 'Push');
    const plannedExercise = await trainingDays.addExercise({
      trainingDayId: day.id,
      name: 'Bench press',
      targetSets: 2,
      targetReps: 8,
      targetWeight: 80,
    });
    const session = await workouts.createSession({
      sourcePlanId: plan.id,
      sourceTrainingDayId: day.id,
      planNameSnapshot: plan.name,
      trainingDayNameSnapshot: day.name,
    });
    const workoutExercise = await workouts.addExercise({
      workoutSessionId: session.id,
      sourcePlannedExerciseId: plannedExercise.id,
      nameSnapshot: plannedExercise.name,
      noteSnapshot: null,
      order: 1,
    });
    await workouts.addSet({
      workoutExerciseId: workoutExercise.id,
      setIndex: 1,
      targetWeight: 80,
      targetReps: 8,
      actualWeight: 80,
      actualReps: 8,
    });
    await workouts.addSet({
      workoutExerciseId: workoutExercise.id,
      setIndex: 2,
      targetWeight: 80,
      targetReps: 8,
      actualWeight: 80,
      actualReps: 8,
    });

    await trainingDays.updateExercise({
      id: plannedExercise.id,
      name: 'Paused bench press',
      metricType: 'reps',
      targetSets: 3,
      targetReps: 5,
      targetWeight: 90,
      targetDurationSec: null,
      note: 'Two-second pause',
    });

    const details = await workouts.getDetails(session.id);
    expect(details?.exercises[0]).toMatchObject({
      nameSnapshot: 'Paused bench press',
      noteSnapshot: 'Two-second pause',
    });
    expect(details?.exercises[0]?.sets).toHaveLength(3);
    expect(details?.exercises[0]?.sets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actualWeight: 90,
          actualReps: 5,
          completed: false,
        }),
      ]),
    );
  });
});
