import type { ImportExportType } from '@shared/types/domain';
import type { ExerciseHistoryRow } from '@entities/analytics/model/types';
import type { Plan } from '@entities/plan/model/types';
import type { PlannedExercise, TrainingDay } from '@entities/training-day/model/types';
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '@entities/workout/model/types';
import type { UserSettings } from '@entities/settings/model/types';
import type { ExerciseMetricType } from '@shared/types/domain';
import type { MeasurementType, SetEffort, WeightMode } from '@shared/types/domain';
import type { Exercise } from '@entities/exercise/model/types';
import type { BodyMetricEntry } from '@entities/body-metric/model/types';

export interface ExportEnvelope<TPayload, TType extends ImportExportType> {
  schemaVersion: 1 | 2;
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
      exerciseId?: string | null;
      metricType?: ExerciseMetricType;
      measurementType?: MeasurementType;
      weightMode?: WeightMode | null;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
      targetDurationSec?: number | null;
      note: string | null;
      order: number;
    }>;
  }>;
}

export interface WorkoutProgramsPayload {
  programs: WorkoutPlanPayload[];
  exerciseDictionary?: Exercise[];
}

export interface FullBackupPayload {
  exerciseDictionary: Exercise[];
  bodyMetrics: BodyMetricEntry[];
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
    | 'restPreset1Sec'
    | 'restPreset2Sec'
    | 'restPreset3Sec'
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
        exerciseId: string | null;
        note: string | null;
        metricType: ExerciseMetricType;
        measurementType: MeasurementType;
        weightMode: WeightMode | null;
        order: number;
        sets: Array<{
          index: number;
          targetWeight: number | null;
          targetReps: number | null;
          targetDurationSec: number | null;
          actualWeight: number;
          actualReps: number;
          actualDurationSec: number | null;
          effort: SetEffort | null;
          exerciseStartedAt: string | null;
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
