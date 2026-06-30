import type { WorkoutDetails, WorkoutExercise, WorkoutSet } from '../model/types';

import { getRestLabel } from './getRestLabel';

const createSet = (id: string): WorkoutSet => ({
  id,
  workoutExerciseId: 'exercise',
  setIndex: 1,
  targetWeight: 80,
  targetReps: 5,
  targetDurationSec: null,
  actualWeight: 80,
  actualReps: 5,
  actualDurationSec: null,
  exerciseStartedAt: null,
  completed: true,
  completedAt: '2026-06-30T10:00:00.000Z',
  restStartedAt: null,
  restFinishedAt: null,
  restDurationSec: null,
  restTargetSec: null,
  createdAt: '2026-06-30T10:00:00.000Z',
  updatedAt: '2026-06-30T10:00:00.000Z',
});

const createExercise = (id: string, workoutSet: WorkoutSet): WorkoutExercise & { sets: WorkoutSet[] } => ({
  id,
  workoutSessionId: 'session',
  sourcePlannedExerciseId: null,
  nameSnapshot: id,
  noteSnapshot: null,
  metricType: 'reps',
  order: 1,
  createdAt: '2026-06-30T10:00:00.000Z',
  updatedAt: '2026-06-30T10:00:00.000Z',
  sets: [workoutSet],
});

describe('getRestLabel', () => {
  it('keeps rest available after the final set of the final exercise', () => {
    const details: WorkoutDetails = {
      session: {
        id: 'session',
        sourcePlanId: null,
        sourceTrainingDayId: null,
        planNameSnapshot: 'Plan',
        trainingDayNameSnapshot: 'Day',
        status: 'planned',
        startedAt: '2026-06-30T10:00:00.000Z',
        finishedAt: null,
        durationSec: null,
        createdAt: '2026-06-30T10:00:00.000Z',
        updatedAt: '2026-06-30T10:00:00.000Z',
      },
      exercises: [
        createExercise('first', createSet('first-set')),
        createExercise('last', createSet('last-set')),
      ],
    };

    expect(getRestLabel(details, 'first-set')).toBe('Next exercise');
    expect(getRestLabel(details, 'last-set')).toBe('Rest');
  });
});
