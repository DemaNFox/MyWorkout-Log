import type { TrendDirection } from '@shared/types/domain';
import type { ExerciseMetricType } from '@shared/types/domain';

export interface AnalyticsExercise {
  exerciseId: string | null;
  name: string;
  metricType?: ExerciseMetricType;
}

export interface ExerciseHistoryRow {
  workoutSessionId: string;
  workoutExerciseId: string;
  date: string;
  bestWeight: number;
  repsAtBestWeight: number;
  setsAtBestWeight: number;
  bestSingleWeight: number;
  repsAtBestSingleWeight: number;
  completedSets: number;
  trend: TrendDirection;
}

export interface ExerciseProgressPoint {
  date: string;
  weight: number;
  reps: number;
  trend: TrendDirection;
}
