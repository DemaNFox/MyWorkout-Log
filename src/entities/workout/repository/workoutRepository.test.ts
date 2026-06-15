import { PlanRepository } from '@entities/plan/repository/planRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { WorkoutRepository } from './workoutRepository';

describe('WorkoutRepository', () => {
  it('lists workout sessions only for the active plan', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const workouts = new WorkoutRepository(db);

    const inactivePlan = await plans.create('Inactive');
    const activePlan = await plans.create('Active');
    await plans.activate(activePlan.id);

    await workouts.createSession({
      sourcePlanId: inactivePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: inactivePlan.name,
      trainingDayNameSnapshot: 'Day',
    });
    const activeSession = await workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: 'Day',
    });

    const sessions = await workouts.listSessionsForActivePlan();

    expect(sessions.map(session => session.id)).toEqual([activeSession.id]);
  });

  it('returns no display history when there is no active plan', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const workouts = new WorkoutRepository(db);

    const plan = await plans.create('Inactive');
    await workouts.createSession({
      sourcePlanId: plan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: plan.name,
      trainingDayNameSnapshot: 'Day',
    });

    await expect(workouts.listSessionsForActivePlan()).resolves.toEqual([]);
  });
});
