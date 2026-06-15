import type { ImportExportType } from '@shared/types/domain';
import type { Plan } from '@entities/plan/model/types';
import type { PlannedExercise, TrainingDay } from '@entities/training-day/model/types';
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '@entities/workout/model/types';
import type { UserSettings } from '@entities/settings/model/types';

export interface ExportEnvelope<TPayload, TType extends ImportExportType> {
  schemaVersion: 1;
  type: TType;
  exportedAt: string;
  payload: TPayload;
}

export interface WorkoutPlanPayload {
  name: string;
  days: Array<{
    name: string;
    order: number;
    exercises: Array<{
      name: string;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
      note: string | null;
      order: number;
    }>;
  }>;
}

export interface FullBackupPayload {
  settings: Pick<UserSettings, 'weightUnit' | 'defaultRestSec' | 'dateFormat' | 'themeMode' | 'timerAlert'>;
  plans: Plan[];
  trainingDays: TrainingDay[];
  plannedExercises: PlannedExercise[];
  workoutSessions: WorkoutSession[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
}

export type WorkoutPlanExport = ExportEnvelope<WorkoutPlanPayload, 'workout-plan'>;

export type FullBackupExport = ExportEnvelope<FullBackupPayload, 'full-backup'> & {
  app: {
    name: 'Workout Logger';
    version: string;
  };
};

export type ImportEnvelope = WorkoutPlanExport | FullBackupExport;
