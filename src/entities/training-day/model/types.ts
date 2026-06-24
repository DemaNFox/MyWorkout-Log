import type { ExerciseMetricType } from '@shared/types/domain';

export interface TrainingDay {
  id: string;
  planId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedExercise {
  id: string;
  trainingDayId: string;
  name: string;
  metricType: ExerciseMetricType;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  targetDurationSec: number | null;
  note: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}
