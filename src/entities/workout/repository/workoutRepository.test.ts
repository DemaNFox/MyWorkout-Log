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

  it('returns the open workout session for the active plan', async () => {
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
      trainingDayNameSnapshot: 'Inactive day',
    });
    const activeSession = await workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: 'Active day',
    });

    await expect(workouts.getOpenSessionForActivePlan()).resolves.toMatchObject({
      id: activeSession.id,
      trainingDayNameSnapshot: 'Active day',
    });

    await workouts.finishSession(activeSession.id, 'completed');

    await expect(workouts.getOpenSessionForActivePlan()).resolves.toBeNull();
  });

  it('closes stale open sessions for the same plan when a workout is completed', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const workouts = new WorkoutRepository(db);

    const activePlan = await plans.create('Active');
    await plans.activate(activePlan.id);

    const staleSession = await workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: 'Push',
    });
    const currentSession = await workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: 'Push',
    });

    await workouts.finishSession(currentSession.id, 'completed');

    await expect(workouts.getSession(currentSession.id)).resolves.toMatchObject({
      status: 'completed',
      finishedAt: expect.any(String),
    });
    await expect(workouts.getSession(staleSession.id)).resolves.toMatchObject({
      status: 'interrupted',
      finishedAt: expect.any(String),
    });
    await expect(workouts.getOpenSessionForActivePlan()).resolves.toBeNull();
  });

  it('deletes a workout session with its exercises and sets', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const workouts = new WorkoutRepository(db);

    const session = await workouts.createSession({
      sourcePlanId: null,
      sourceTrainingDayId: null,
      planNameSnapshot: 'Plan',
      trainingDayNameSnapshot: 'Day',
    });
    const exercise = await workouts.addExercise({
      workoutSessionId: session.id,
      sourcePlannedExerciseId: null,
      nameSnapshot: 'Bench Press',
      noteSnapshot: null,
      order: 1,
    });
    const set = await workouts.addSet({
      workoutExerciseId: exercise.id,
      setIndex: 1,
      targetWeight: 80,
      targetReps: 5,
      actualWeight: 80,
      actualReps: 5,
    });

    await workouts.deleteSession(session.id);

    await expect(workouts.getSession(session.id)).resolves.toBeNull();
    await expect(workouts.listExercises(session.id)).resolves.toEqual([]);
    await expect(workouts.getSet(set.id)).resolves.toBeNull();
  });

  it('clears finished history for the active plan without deleting open workouts', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const plans = new PlanRepository(db);
    const workouts = new WorkoutRepository(db);

    const activePlan = await plans.create('Active');
    await plans.activate(activePlan.id);
    const finishedSession = await workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: 'Push',
    });
    await workouts.finishSession(finishedSession.id, 'completed');
    const openSession = await workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: null,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: 'Pull',
    });

    await expect(workouts.clearFinishedSessionsForActivePlan()).resolves.toBe(1);

    await expect(workouts.getSession(finishedSession.id)).resolves.toBeNull();
    await expect(workouts.getSession(openSession.id)).resolves.toMatchObject({ id: openSession.id });
  });

  it('tracks rest timing for a completed set', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const workouts = new WorkoutRepository(db);

    const session = await workouts.createSession({
      sourcePlanId: null,
      sourceTrainingDayId: null,
      planNameSnapshot: 'Plan',
      trainingDayNameSnapshot: 'Day',
    });
    const exercise = await workouts.addExercise({
      workoutSessionId: session.id,
      sourcePlannedExerciseId: null,
      nameSnapshot: 'Bench Press',
      noteSnapshot: null,
      order: 1,
    });
    const set = await workouts.addSet({
      workoutExerciseId: exercise.id,
      setIndex: 1,
      targetWeight: 80,
      targetReps: 5,
      actualWeight: 80,
      actualReps: 5,
    });

    await workouts.completeSet(set.id, 80, 5);
    await workouts.startRest(set.id, 120);
    const runningRest = await workouts.getSet(set.id);

    expect(runningRest).toMatchObject({
      restFinishedAt: null,
      restDurationSec: null,
      restTargetSec: 120,
    });
    expect(runningRest?.restStartedAt).toEqual(expect.any(String));

    await workouts.finishRest(set.id);
    const finishedRest = await workouts.getSet(set.id);

    expect(finishedRest?.restFinishedAt).toEqual(expect.any(String));
    expect(finishedRest?.restDurationSec).toEqual(expect.any(Number));

    await workouts.updateRestDuration(set.id, 180);
    await expect(workouts.getSet(set.id)).resolves.toMatchObject({
      restDurationSec: 180,
    });

    await workouts.resetRest(set.id);
    await expect(workouts.getSet(set.id)).resolves.toMatchObject({
      restStartedAt: null,
      restFinishedAt: null,
      restDurationSec: null,
    });
  });
});
