import type { WorkoutStatus } from '@shared/types/domain';

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
  actualWeight: number;
  actualReps: number;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutDetails {
  session: WorkoutSession;
  exercises: Array<WorkoutExercise & { sets: WorkoutSet[] }>;
}
