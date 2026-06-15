import { calculateTrend, withTrends } from './calculateExerciseDynamics';

describe('calculateTrend', () => {
  it('marks first performance as none', () => {
    expect(calculateTrend(null, { bestWeight: 80, repsAtBestWeight: 8 })).toBe('none');
  });

  it('marks higher weight with same reps as up', () => {
    expect(calculateTrend({ bestWeight: 75, repsAtBestWeight: 8 }, { bestWeight: 80, repsAtBestWeight: 8 })).toBe('up');
  });

  it('marks lower reps at same weight as down', () => {
    expect(calculateTrend({ bestWeight: 80, repsAtBestWeight: 8 }, { bestWeight: 80, repsAtBestWeight: 6 })).toBe('down');
  });

  it('builds ordered trends', () => {
    const rows = withTrends([
      {
        workoutSessionId: '1',
        workoutExerciseId: 'a',
        date: '2026-06-01T00:00:00.000Z',
        bestWeight: 75,
        repsAtBestWeight: 8,
        completedSets: 3,
      },
      {
        workoutSessionId: '2',
        workoutExerciseId: 'b',
        date: '2026-06-08T00:00:00.000Z',
        bestWeight: 77.5,
        repsAtBestWeight: 8,
        completedSets: 3,
      },
    ]);
    expect(rows.map(row => row.trend)).toEqual(['none', 'up']);
  });
});
