import type { TrendDirection } from '@shared/types/domain';

import type { ExerciseHistoryRow } from '../model/types';

export const calculateTrend = (
  previous: Pick<ExerciseHistoryRow, 'bestWeight' | 'repsAtBestWeight'> | null,
  current: Pick<ExerciseHistoryRow, 'bestWeight' | 'repsAtBestWeight'>,
): TrendDirection => {
  if (!previous) {
    return 'none';
  }
  if (current.bestWeight > previous.bestWeight && current.repsAtBestWeight >= previous.repsAtBestWeight) {
    return 'up';
  }
  if (current.bestWeight < previous.bestWeight) {
    return 'down';
  }
  if (current.bestWeight === previous.bestWeight && current.repsAtBestWeight < previous.repsAtBestWeight) {
    return 'down';
  }
  if (current.bestWeight === previous.bestWeight && current.repsAtBestWeight === previous.repsAtBestWeight) {
    return 'same';
  }
  return current.repsAtBestWeight > previous.repsAtBestWeight ? 'up' : 'same';
};

export const withTrends = (
  rows: Array<Omit<ExerciseHistoryRow, 'trend'>>,
): ExerciseHistoryRow[] => {
  let previous: ExerciseHistoryRow | null = null;
  return rows.map(row => {
    const trend = calculateTrend(previous, row);
    const current: ExerciseHistoryRow = { ...row, trend };
    previous = current;
    return current;
  });
};
