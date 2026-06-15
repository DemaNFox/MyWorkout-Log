import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';

import { PlanRepository } from './planRepository';

describe('PlanRepository', () => {
  it('keeps only one active plan', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const repository = new PlanRepository(db);

    const first = await repository.create('First');
    const second = await repository.create('Second');

    await repository.activate(first.id);
    await repository.activate(second.id);

    const plans = await repository.list();
    expect(plans.find(plan => plan.id === first.id)?.status).toBe('inactive');
    expect(plans.find(plan => plan.id === second.id)?.status).toBe('active');
  });

  it('deletes workout sessions created from the removed plan', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const workouts = new WorkoutRepository(db);

    const plan = await plans.create('Program');
    await workouts.createSession({
      sourcePlanId: plan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: plan.name,
      trainingDayNameSnapshot: 'Day',
    });

    await plans.delete(plan.id);

    expect(db.tables.get('workout_sessions')).toEqual([]);
  });
});
