import type { ImportExportType } from '@shared/types/domain';
import type { ExerciseHistoryRow } from '@entities/analytics/model/types';
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

export interface WorkoutProgramsPayload {
  programs: WorkoutPlanPayload[];
}

export interface FullBackupPayload {
  settings: Pick<
    UserSettings,
    | 'weightUnit'
    | 'defaultRestSec'
    | 'dateFormat'
    | 'themeMode'
    | 'timerAlert'
    | 'timerSoundUri'
    | 'timerSoundTitle'
    | 'timerSoundVolume'
  >;
  plans: Plan[];
  trainingDays: TrainingDay[];
  plannedExercises: PlannedExercise[];
  workoutSessions: WorkoutSession[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
}

export interface ProgramHistoryPayload {
  programs: Array<{
    plan: Pick<Plan, 'id' | 'name' | 'status'>;
    sessions: Array<{
      id: string;
      date: string | null;
      finishedAt: string | null;
      status: WorkoutSession['status'];
      trainingDayName: string | null;
      durationSec: number | null;
      exercises: Array<{
        id: string;
        name: string;
        order: number;
        sets: Array<{
          index: number;
          targetWeight: number | null;
          targetReps: number | null;
          actualWeight: number;
          actualReps: number;
          completed: boolean;
          completedAt: string | null;
          restStartedAt: string | null;
          restFinishedAt: string | null;
          restDurationSec: number | null;
          restTargetSec: number | null;
        }>;
      }>;
    }>;
    exerciseProgress: Array<{
      exerciseName: string;
      bestResult: {
        weight: number;
        reps: number;
        date: string;
      } | null;
      history: ExerciseHistoryRow[];
    }>;
  }>;
}

export type WorkoutPlanExport = ExportEnvelope<WorkoutPlanPayload, 'workout-plan'>;

export type WorkoutProgramsExport = ExportEnvelope<WorkoutProgramsPayload, 'workout-programs'>;

export type ProgramHistoryExport = ExportEnvelope<ProgramHistoryPayload, 'program-history'>;

export type FullBackupExport = ExportEnvelope<FullBackupPayload, 'full-backup'> & {
  app: {
    name: 'Workout Logger';
    version: string;
  };
};

export type ImportEnvelope = WorkoutPlanExport | WorkoutProgramsExport | FullBackupExport;
