import { parseImportEnvelope } from '@entities/import-export/lib/validateImportEnvelope';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import type { WorkoutPlanPayload } from '@entities/import-export/model/types';
import { ExerciseCatalogRepository } from '@entities/exercise/repository/exerciseCatalogRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import type { Database } from '@shared/db/types';

export interface ImportResult {
  importedPlanIds: string[];
}

export class ImportService {
  constructor(private readonly db: Database) {}

  async importJson(raw: string): Promise<ImportResult> {
    const envelope = parseImportEnvelope(raw);
    if (envelope.type === 'workout-plan') {
      return this.importPlans([envelope.payload]);
    }
    if (envelope.type === 'workout-programs') {
      const catalog = new ExerciseCatalogRepository(this.db);
      for (const exercise of envelope.payload.exerciseDictionary ?? []) {
        await catalog.importCustom(exercise);
      }
      return this.importPlans(envelope.payload.programs);
    }
    return { importedPlanIds: [] };
  }

  private async importPlans(payloads: WorkoutPlanPayload[]): Promise<ImportResult> {
    const plans = new PlanRepository(this.db);
    const days = new TrainingDayRepository(this.db);
    const importedPlanIds: string[] = [];

    await this.db.transaction(async () => {
      for (const payload of payloads) {
        const plan = await plans.create(payload.name);
        importedPlanIds.push(plan.id);
        const sortedDays = [...payload.days].sort((left, right) => left.order - right.order);
        for (const dayPayload of sortedDays) {
          const day = await days.createDay(plan.id, dayPayload.name);
          const sortedExercises = [...dayPayload.exercises].sort((left, right) => left.order - right.order);
          for (const exercise of sortedExercises) {
            await days.addExercise({
              trainingDayId: day.id,
              name: exercise.name,
              exerciseId: exercise.exerciseId ?? null,
              metricType: exercise.metricType ?? 'reps',
              ...(exercise.measurementType
                ? { measurementType: exercise.measurementType }
                : {}),
              weightMode: exercise.weightMode ?? null,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
              targetWeight: exercise.targetWeight,
              targetDurationSec: exercise.targetDurationSec ?? null,
              note: exercise.note,
            });
          }
        }
      }
    });

    return { importedPlanIds };
  }
}
