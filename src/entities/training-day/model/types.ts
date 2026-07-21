import type { ExerciseMetricType, MeasurementType, WeightMode } from '@shared/types/domain';

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
  exerciseId: string | null;
  metricType: ExerciseMetricType;
  measurementType: MeasurementType;
  weightMode: WeightMode | null;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  targetDurationSec: number | null;
  note: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}
