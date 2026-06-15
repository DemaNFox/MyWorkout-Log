import { parseImportEnvelope } from '@entities/import-export/lib/validateImportEnvelope';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import type { Database } from '@shared/db/types';

export class ImportService {
  constructor(private readonly db: Database) {}

  async importJson(raw: string): Promise<string> {
    const envelope = parseImportEnvelope(raw);
    if (envelope.type === 'workout-plan') {
      const plans = new PlanRepository(this.db);
      const days = new TrainingDayRepository(this.db);
      const plan = await plans.create(envelope.payload.name);
      for (const dayPayload of envelope.payload.days) {
        const day = await days.createDay(plan.id, dayPayload.name);
        for (const exercise of dayPayload.exercises) {
          await days.addExercise({
            trainingDayId: day.id,
            name: exercise.name,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            note: exercise.note,
          });
        }
      }
      return plan.id;
    }
    return 'full-backup-validated';
  }
}
