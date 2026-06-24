import type { ExerciseMetricType, WorkoutStatus } from '@shared/types/domain';

export interface WorkoutSession {
  id: string;
  sourcePlanId: string | null;
  sourceTrainingDayId: string | null;
  planNameSnapshot: string | null;
  trainingDayNameSnapshot: string | null;
  status: WorkoutStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationSec: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  workoutSessionId: string;
  sourcePlannedExerciseId: string | null;
  nameSnapshot: string;
  noteSnapshot: string | null;
  metricType: ExerciseMetricType;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setIndex: number;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSec: number | null;
  actualWeight: number;
  actualReps: number;
  actualDurationSec: number | null;
  exerciseStartedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  restStartedAt: string | null;
  restFinishedAt: string | null;
  restDurationSec: number | null;
  restTargetSec: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutDetails {
  session: WorkoutSession;
  exercises: Array<WorkoutExercise & { sets: WorkoutSet[] }>;
}
