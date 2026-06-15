import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import type { FullBackupExport, WorkoutPlanExport } from '@entities/import-export/model/types';
import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { AppError } from '@shared/lib/errors';

export class ExportService {
  constructor(private readonly db: Database) {}

  async exportPlan(planId: string): Promise<WorkoutPlanExport> {
    const plans = new PlanRepository(this.db);
    const daysRepo = new TrainingDayRepository(this.db);
    const plan = await plans.getById(planId);
    if (!plan) {
      throw new AppError('Plan not found', 'export.planNotFound');
    }
    const days = await daysRepo.listDays(plan.id);
    return {
      schemaVersion: 1,
      type: 'workout-plan',
      exportedAt: nowIso(),
      payload: {
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
      },
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
}
