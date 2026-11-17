import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { StartWorkoutService } from '@features/workout-start/model/startWorkoutService';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { ProgressTransferService } from './progressTransferService';

const setup = async () => {
  const db = new MemoryDatabase();
  await runMigrations(db);
  const plans = new PlanRepository(db);
  const days = new TrainingDayRepository(db);
  const workouts = new WorkoutRepository(db);
  const oldPlan = await plans.create('Old program');
  await plans.activate(oldPlan.id);
  const oldDay = await days.createDay(oldPlan.id, 'Old day');
  await days.addExercise({ trainingDayId: oldDay.id, name: 'Back Squat', exerciseId: 'back-squat', targetSets: 2, targetReps: 5, targetWeight: 60 });
  const oldSession = await new StartWorkoutService(db).startFromActivePlan(oldDay.id);
  const oldSets = (await workouts.getDetails(oldSession.id))!.exercises[0]!.sets;
  await workouts.completeSet(oldSets[0]!.id, 72.5, 6);
  await workouts.completeSet(oldSets[1]!.id, 75, 5);
  await workouts.finishSession(oldSession.id, 'completed');

  const newPlan = await plans.create('New program');
  await plans.activate(newPlan.id);
  const newDay = await days.createDay(newPlan.id, 'Day A');
  await days.addExercise({ trainingDayId: newDay.id, name: 'Приседания со штангой', exerciseId: 'back-squat', targetSets: 2, targetReps: 8, targetWeight: 50 });
  return { db, plans, days, workouts, newPlan, newDay };
};

describe('ProgressTransferService', () => {
  it('offers a one-time transfer and keeps newer results in the current program authoritative', async () => {
    const { db, workouts, newPlan, newDay } = await setup();
    const service = new ProgressTransferService(db);
    expect(await service.getOffer()).toEqual({ planId: newPlan.id, exerciseCount: 1 });

    expect(await service.accept(newPlan.id)).toBe(1);
    expect(await service.getOffer()).toBeNull();
    expect(await service.accept(newPlan.id)).toBe(0);

    const first = await new StartWorkoutService(db).startFromActivePlan(newDay.id);
    const firstSets = (await workouts.getDetails(first.id))!.exercises[0]!.sets;
    expect(firstSets.map(set => [set.actualWeight, set.actualReps])).toEqual([[72.5, 6], [75, 5]]);
    expect(firstSets[0]).toMatchObject({ targetWeight: 50, targetReps: 8 });

    await workouts.completeSet(firstSets[0]!.id, 80, 4);
    await workouts.finishSession(first.id, 'completed');
    const second = await new StartWorkoutService(db).startFromActivePlan(newDay.id);
    const secondSets = (await workouts.getDetails(second.id))!.exercises[0]!.sets;
    expect(secondSets.map(set => [set.actualWeight, set.actualReps])).toEqual([[80, 4], [80, 4]]);
  });

  it('keeps planned values after declining and does not ask again', async () => {
    const { db, workouts, newDay } = await setup();
    const service = new ProgressTransferService(db);
    await service.decline();
    expect(await service.getOffer()).toBeNull();
    const session = await new StartWorkoutService(db).startFromActivePlan(newDay.id);
    expect((await workouts.getDetails(session.id))?.exercises[0]?.sets[0]).toMatchObject({
      actualWeight: 50,
      actualReps: 8,
    });
  });

  it('does not offer a transfer without matching prior history', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plan = await new PlanRepository(db).create('Fresh program');
    await new PlanRepository(db).activate(plan.id);
    expect(await new ProgressTransferService(db).getOffer()).toBeNull();
  });

  it('rolls back partial baselines and leaves the choice open if transfer fails', async () => {
    const { db, newPlan, newDay, days } = await setup();
    const plannedExercise = (await days.listExercises(newDay.id))[0]!;
    const originalExecute = db.execute.bind(db);
    let baselineWrites = 0;
    const executeSpy = jest.spyOn(db, 'execute').mockImplementation((sql, params) => {
      if (sql.includes('INSERT INTO progress_transfer_baselines') && ++baselineWrites === 2) {
        throw new Error('Storage failure');
      }
      return originalExecute(sql, params);
    });

    await expect(new ProgressTransferService(db).accept(newPlan.id)).rejects.toThrow('Storage failure');
    executeSpy.mockRestore();

    expect(await new ProgressTransferService(db).getOffer()).toEqual({ planId: newPlan.id, exerciseCount: 1 });
    expect(await db.getAll('SELECT * FROM progress_transfer_baselines WHERE planned_exercise_id = ?', [plannedExercise.id])).toEqual([]);
  });

  it('transfers a timed exercise without mixing it with repetition values', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const days = new TrainingDayRepository(db);
    const workouts = new WorkoutRepository(db);
    const oldPlan = await plans.create('Old');
    await plans.activate(oldPlan.id);
    const oldDay = await days.createDay(oldPlan.id, 'Core');
    await days.addExercise({ trainingDayId: oldDay.id, name: 'Plank', exerciseId: 'plank', metricType: 'duration', targetSets: 1, targetReps: 0, targetWeight: 0, targetDurationSec: 60 });
    const oldSession = await new StartWorkoutService(db).startFromActivePlan(oldDay.id);
    const oldSet = (await workouts.getDetails(oldSession.id))!.exercises[0]!.sets[0]!;
    await workouts.completeSet(oldSet.id, 0, 0, 75);
    await workouts.finishSession(oldSession.id, 'completed');

    const newPlan = await plans.create('New');
    await plans.activate(newPlan.id);
    const newDay = await days.createDay(newPlan.id, 'Core');
    await days.addExercise({ trainingDayId: newDay.id, name: 'Планка', exerciseId: 'plank', metricType: 'duration', targetSets: 1, targetReps: 0, targetWeight: 0, targetDurationSec: 45 });

    expect(await new ProgressTransferService(db).accept(newPlan.id)).toBe(1);
    const session = await new StartWorkoutService(db).startFromActivePlan(newDay.id);
    expect((await workouts.getDetails(session.id))?.exercises[0]?.sets[0]).toMatchObject({
      targetDurationSec: 45,
      actualDurationSec: 75,
    });
  });

  it('stops using a transferred baseline if the planned exercise metric changes', async () => {
    const { db, days, workouts, newPlan, newDay } = await setup();
    await new ProgressTransferService(db).accept(newPlan.id);
    const exercise = (await days.listExercises(newDay.id))[0]!;
    await days.updateExercise({
      id: exercise.id,
      name: exercise.name,
      metricType: 'duration',
      targetSets: 2,
      targetReps: 0,
      targetWeight: 0,
      targetDurationSec: 45,
      note: null,
    });

    const session = await new StartWorkoutService(db).startFromActivePlan(newDay.id);
    expect((await workouts.getDetails(session.id))?.exercises[0]?.sets[0]).toMatchObject({
      actualWeight: 0,
      actualReps: 0,
      actualDurationSec: 45,
    });
  });
});
