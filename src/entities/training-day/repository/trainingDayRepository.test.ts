import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';

import { TrainingDayRepository } from './trainingDayRepository';

describe('TrainingDayRepository', () => {
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
});
