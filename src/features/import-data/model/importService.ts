import { parseImportEnvelope } from '@entities/import-export/lib/validateImportEnvelope';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import type { WorkoutPlanPayload } from '@entities/import-export/model/types';
import type { Exercise } from '@entities/exercise/model/types';
import { ExerciseCatalogRepository } from '@entities/exercise/repository/exerciseCatalogRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import type { Database } from '@shared/db/types';
import { AppError } from '@shared/lib/errors';
import { ExerciseCommentRepository } from '@entities/exercise-comment/repository/exerciseCommentRepository';

export interface ImportResult {
  importedPlanIds: string[];
  importedCommentCount?: number;
}

export class ImportService {
  constructor(private readonly db: Database) {}

  async importJson(raw: string): Promise<ImportResult> {
    const envelope = parseImportEnvelope(raw);
    if (envelope.type === 'workout-plan') {
      return this.importPrograms([envelope.payload], []);
    }
    if (envelope.type === 'workout-programs') {
      return this.importPrograms(
        envelope.payload.programs,
        envelope.payload.exerciseDictionary ?? [],
      );
    }
    if (envelope.type === 'exercise-comments') {
      let importedCommentCount = 0;
      await this.db.transaction(async () => {
        await this.prepareCommentExerciseCatalog(
          envelope.payload.comments.map(comment => comment.exerciseId),
          envelope.payload.exerciseDictionary,
        );
        importedCommentCount = await new ExerciseCommentRepository(this.db).import(
          envelope.payload.comments,
        );
      });
      return {
        importedPlanIds: [],
        importedCommentCount,
      };
    }
    return { importedPlanIds: [] };
  }

  private async prepareCommentExerciseCatalog(
    exerciseIds: string[],
    exerciseDictionary: Exercise[],
  ): Promise<void> {
    const catalog = new ExerciseCatalogRepository(this.db);
    for (const exerciseId of new Set(exerciseIds)) {
      if (await catalog.getById(exerciseId)) {
        continue;
      }
      const metadata = exerciseDictionary.find(exercise => exercise.id === exerciseId);
      if (!metadata) {
        throw new AppError(
          `Exercise “${exerciseId}” is missing from the exercise dictionary`,
          'import.exerciseMissingMetadata',
        );
      }
      await catalog.importAsCustom({ ...metadata, isCustom: true });
    }
  }

  private async importPrograms(
    payloads: WorkoutPlanPayload[],
    exerciseDictionary: Exercise[],
  ): Promise<ImportResult> {
    const plans = new PlanRepository(this.db);
    const days = new TrainingDayRepository(this.db);
    const importedPlanIds: string[] = [];

    await this.db.transaction(async () => {
      await this.prepareExerciseCatalog(payloads, exerciseDictionary);
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

  private async prepareExerciseCatalog(
    payloads: WorkoutPlanPayload[],
    exerciseDictionary: Exercise[],
  ): Promise<void> {
    const catalog = new ExerciseCatalogRepository(this.db);
    const exercises = payloads.flatMap(program =>
      program.days.flatMap(day => day.exercises),
    );

    for (const plannedExercise of exercises) {
      const existing = plannedExercise.exerciseId
        ? await catalog.getById(plannedExercise.exerciseId)
        : await catalog.findByName(plannedExercise.name);
      if (existing) {
        continue;
      }

      const metadata = exerciseDictionary.find(candidate =>
        plannedExercise.exerciseId
          ? candidate.id === plannedExercise.exerciseId
          : candidate.name.trim().toLocaleLowerCase() ===
            plannedExercise.name.trim().toLocaleLowerCase(),
      );
      if (!metadata) {
        throw new AppError(
          `Exercise “${plannedExercise.name}” is missing from the exercise dictionary`,
          'import.exerciseMissingMetadata',
        );
      }
      await catalog.importAsCustom({ ...metadata, isCustom: true });
    }
  }
}
