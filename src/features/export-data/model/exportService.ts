import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { withTrends } from '@entities/analytics/lib/calculateExerciseDynamics';
import type {
  FullBackupExport,
  ProgramHistoryExport,
  ProgramHistoryPayload,
  WorkoutPlanExport,
  WorkoutPlanPayload,
  WorkoutProgramsExport,
} from '@entities/import-export/model/types';
import type { ExerciseHistoryRow } from '@entities/analytics/model/types';
import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { AppError } from '@shared/lib/errors';

export class ExportService {
  constructor(private readonly db: Database) {}

  async exportPlan(planId: string): Promise<WorkoutPlanExport> {
    const payload = await this.getWorkoutPlanPayload(planId);

    return {
      schemaVersion: 1,
      type: 'workout-plan',
      exportedAt: nowIso(),
      payload,
    };
  }

  async exportPrograms(planIds: string[]): Promise<WorkoutProgramsExport> {
    if (planIds.length === 0) {
      throw new AppError('Select at least one program', 'export.noProgramsSelected');
    }

    return {
      schemaVersion: 1,
      type: 'workout-programs',
      exportedAt: nowIso(),
      payload: {
        programs: await Promise.all(planIds.map(planId => this.getWorkoutPlanPayload(planId))),
      },
    };
  }

  private async getWorkoutPlanPayload(planId: string): Promise<WorkoutPlanPayload> {
    const plans = new PlanRepository(this.db);
    const daysRepo = new TrainingDayRepository(this.db);
    const plan = await plans.getById(planId);
    if (!plan) {
      throw new AppError('Plan not found', 'export.planNotFound');
    }
    const days = await daysRepo.listDays(plan.id);
    return {
      name: plan.name,
      days: await Promise.all(
        days.map(async day => ({
          name: day.name,
          order: day.order,
          exercises: (await daysRepo.listExercises(day.id)).map(exercise => ({
            name: exercise.name,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            note: exercise.note,
            order: exercise.order,
          })),
        })),
      ),
    };
  }

  async createBackup(): Promise<FullBackupExport> {
    const settings = await new SettingsRepository(this.db).get();
    const plans = await new PlanRepository(this.db).list();
    const daysRepo = new TrainingDayRepository(this.db);
    const workoutRepo = new WorkoutRepository(this.db);
    const trainingDays = (await Promise.all(plans.map(plan => daysRepo.listDays(plan.id)))).flat();
    const plannedExercises = (
      await Promise.all(trainingDays.map(day => daysRepo.listExercises(day.id)))
    ).flat();
    const workoutSessions = await workoutRepo.listSessions(1000);
    const workoutExercises = (
      await Promise.all(workoutSessions.map(session => workoutRepo.listExercises(session.id)))
    ).flat();
    const workoutSets = (
      await Promise.all(workoutExercises.map(exercise => workoutRepo.listSets(exercise.id)))
    ).flat();

    return {
      schemaVersion: 1,
      type: 'full-backup',
      exportedAt: nowIso(),
      app: { name: 'Workout Logger', version: '1.0.0' },
      payload: {
        settings: {
          weightUnit: settings.weightUnit,
          defaultRestSec: settings.defaultRestSec,
          dateFormat: settings.dateFormat,
          themeMode: settings.themeMode,
          timerAlert: settings.timerAlert,
          timerSoundUri: settings.timerSoundUri,
          timerSoundTitle: settings.timerSoundTitle,
          timerSoundVolume: settings.timerSoundVolume,
        },
        plans,
        trainingDays,
        plannedExercises,
        workoutSessions,
        workoutExercises,
        workoutSets,
      },
    };
  }

  async exportActiveProgramHistory(): Promise<ProgramHistoryExport> {
    const plan = await new PlanRepository(this.db).getActive();
    if (!plan) {
      throw new AppError('Active plan not found', 'export.activePlanNotFound');
    }

    return this.exportProgramHistory([plan.id]);
  }

  async exportProgramHistory(planIds: string[]): Promise<ProgramHistoryExport> {
    if (planIds.length === 0) {
      throw new AppError('Select at least one program', 'export.noProgramsSelected');
    }

    const planRepo = new PlanRepository(this.db);
    const workoutRepo = new WorkoutRepository(this.db);
    const programs = await Promise.all(
      planIds.map(async planId => {
        const plan = await planRepo.getById(planId);
        if (!plan) {
          throw new AppError('Plan not found', 'export.planNotFound');
        }
        const sessions = await workoutRepo.listSessionsForPlan(plan.id, 10000);
        const exportedSessions = await Promise.all(
          sessions.map(async session => ({
            id: session.id,
            date: session.startedAt,
            finishedAt: session.finishedAt,
            status: session.status,
            trainingDayName: session.trainingDayNameSnapshot,
            durationSec: session.durationSec,
            exercises: await Promise.all(
              (await workoutRepo.listExercises(session.id)).map(async exercise => ({
                id: exercise.id,
                name: exercise.nameSnapshot,
                order: exercise.order,
                sets: (await workoutRepo.listSets(exercise.id)).map(set => ({
                  index: set.setIndex,
                  targetWeight: set.targetWeight,
                  targetReps: set.targetReps,
                  actualWeight: set.actualWeight,
                  actualReps: set.actualReps,
                  completed: set.completed,
                  completedAt: set.completedAt,
                  restStartedAt: set.restStartedAt,
                  restFinishedAt: set.restFinishedAt,
                  restDurationSec: set.restDurationSec,
                  restTargetSec: set.restTargetSec,
                })),
              })),
            ),
          })),
        );

        return {
          plan: {
            id: plan.id,
            name: plan.name,
            status: plan.status,
          },
          sessions: exportedSessions,
          exerciseProgress: buildExerciseProgress(exportedSessions),
        };
      }),
    );

    return {
      schemaVersion: 1,
      type: 'program-history',
      exportedAt: nowIso(),
      payload: { programs },
    };
  }
}

type ProgramHistorySession = ProgramHistoryPayload['programs'][number]['sessions'][number];

const buildExerciseProgress = (
  sessions: ProgramHistorySession[],
): ProgramHistoryPayload['programs'][number]['exerciseProgress'] => {
  const byExercise = new Map<string, Array<Omit<ExerciseHistoryRow, 'trend'>>>();

  sessions.forEach(session => {
    session.exercises.forEach(exercise => {
      const completedSets = exercise.sets.filter(set => set.completed);
      const bestSet = completedSets.reduce<ProgramHistorySession['exercises'][number]['sets'][number] | null>(
        (best, set) => {
          if (!best || set.actualWeight > best.actualWeight) {
            return set;
          }
          if (set.actualWeight === best.actualWeight && set.actualReps > best.actualReps) {
            return set;
          }
          return best;
        },
        null,
      );

      if (!bestSet) {
        return;
      }

      byExercise.set(exercise.name, [
        ...(byExercise.get(exercise.name) ?? []),
        {
          workoutSessionId: session.id,
          workoutExerciseId: exercise.id,
          date: session.date ?? '',
          bestWeight: bestSet.actualWeight,
          repsAtBestWeight: bestSet.actualReps,
          completedSets: completedSets.length,
        },
      ]);
    });
  });

  return [...byExercise.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([exerciseName, rows]) => {
      const history = withTrends(rows.sort((left, right) => left.date.localeCompare(right.date)));

      return {
        exerciseName,
        bestResult: getBestResult(history),
        history,
      };
    });
};

const getBestResult = (
  history: ExerciseHistoryRow[],
): ProgramHistoryPayload['programs'][number]['exerciseProgress'][number]['bestResult'] =>
  history.reduce<ProgramHistoryPayload['programs'][number]['exerciseProgress'][number]['bestResult']>((best, row) => {
    if (!best || row.bestWeight > best.weight) {
      return { weight: row.bestWeight, reps: row.repsAtBestWeight, date: row.date };
    }
    if (row.bestWeight === best.weight && row.repsAtBestWeight > best.reps) {
      return { weight: row.bestWeight, reps: row.repsAtBestWeight, date: row.date };
    }
    return best;
  }, null);
