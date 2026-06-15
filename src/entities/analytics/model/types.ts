import type { TrendDirection } from '@shared/types/domain';

export interface ExerciseHistoryRow {
  workoutSessionId: string;
  workoutExerciseId: string;
  date: string;
  bestWeight: number;
  repsAtBestWeight: number;
  completedSets: number;
  trend: TrendDirection;
}

export interface ExerciseProgressPoint {
  date: string;
  weight: number;
  reps: number;
  trend: TrendDirection;
}
