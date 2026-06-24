import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { StartWorkoutService } from './startWorkoutService';

describe('StartWorkoutService', () => {
  it('starts the selected training day instead of the first day', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const trainingDays = new TrainingDayRepository(db);

    const plan = await plans.create('Strength');
    await plans.activate(plan.id);
    await trainingDays.createDay(plan.id, 'Push');
    const pullDay = await trainingDays.createDay(plan.id, 'Pull');
    await trainingDays.addExercise({
      trainingDayId: pullDay.id,
      name: 'Deadlift',
      targetSets: 3,
      targetReps: 5,
      targetWeight: 100,
    });

    const session = await new StartWorkoutService(db).startFromActivePlan(pullDay.id);
    const details = await new WorkoutRepository(db).getDetails(session.id);

    expect(session).toMatchObject({
      sourceTrainingDayId: pullDay.id,
      trainingDayNameSnapshot: 'Pull',
    });
    expect(details?.exercises.map(exercise => exercise.nameSnapshot)).toEqual(['Deadlift']);
  });

  it('creates duration sets for a timed exercise', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const trainingDays = new TrainingDayRepository(db);

    const plan = await plans.create('Core');
    await plans.activate(plan.id);
    const day = await trainingDays.createDay(plan.id, 'Core day');
    await trainingDays.addExercise({
      trainingDayId: day.id,
      name: 'Plank',
      metricType: 'duration',
      targetSets: 3,
      targetReps: 0,
      targetWeight: 0,
      targetDurationSec: 90,
    });

    const session = await new StartWorkoutService(db).startFromActivePlan(day.id);
    const details = await new WorkoutRepository(db).getDetails(session.id);

    expect(details?.exercises[0]).toMatchObject({
      nameSnapshot: 'Plank',
      metricType: 'duration',
    });
    expect(details?.exercises[0]?.sets).toHaveLength(3);
    expect(details?.exercises[0]?.sets[0]).toMatchObject({
      targetDurationSec: 90,
      actualDurationSec: 90,
    });
  });
});
