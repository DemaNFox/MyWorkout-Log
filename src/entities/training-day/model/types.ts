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
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  note: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}
