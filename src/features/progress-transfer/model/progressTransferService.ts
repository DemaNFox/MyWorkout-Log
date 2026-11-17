import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { ProgressTransferRepository } from '@entities/workout/repository/progressTransferRepository';
import { WorkoutRepository, type CompletedExerciseResult } from '@entities/workout/repository/workoutRepository';
import type { Database } from '@shared/db/types';
import { AppError } from '@shared/lib/errors';
import { normalizeName } from '@shared/lib/normalizeName';
import type { ExerciseMetricType, MeasurementType, WeightMode } from '@shared/types/domain';

export interface ProgressTransferOffer {
  planId: string;
  exerciseCount: number;
}

const findMatchingResult = (
  history: CompletedExerciseResult[],
  exercise: { exerciseId: string | null; name: string; metricType: ExerciseMetricType; measurementType: MeasurementType; weightMode: WeightMode | null },
): CompletedExerciseResult | undefined => history.find(result =>
  result.metricType === exercise.metricType &&
  result.measurementType === exercise.measurementType &&
  (exercise.measurementType !== 'weight_reps' || result.weightMode === exercise.weightMode) && (
    (exercise.exerciseId !== null && result.exerciseId === exercise.exerciseId) ||
    ((exercise.exerciseId === null || result.exerciseId === null) &&
      normalizeName(result.name) === normalizeName(exercise.name))
  ),
);

export class ProgressTransferService {
  private readonly plans: PlanRepository;
  private readonly days: TrainingDayRepository;
  private readonly workouts: WorkoutRepository;
  private readonly transfer: ProgressTransferRepository;

  constructor(private readonly db: Database) {
    this.plans = new PlanRepository(db);
    this.days = new TrainingDayRepository(db);
    this.workouts = new WorkoutRepository(db);
    this.transfer = new ProgressTransferRepository(db);
  }

  async getOffer(): Promise<ProgressTransferOffer | null> {
    if (await this.transfer.hasDecision()) {
      return null;
    }
    const plan = await this.plans.getActive();
    if (!plan) {
      return null;
    }
    let exerciseCount = 0;
    const history = await this.workouts.listCompletedExerciseResultsOutsidePlan(plan.id);
    const days = await this.days.listDays(plan.id);
    for (const day of days) {
      for (const exercise of await this.days.listExercises(day.id)) {
        if (findMatchingResult(history, exercise)) {
          exerciseCount += 1;
        }
      }
    }
    return exerciseCount > 0 ? { planId: plan.id, exerciseCount } : null;
  }

  async accept(planId: string): Promise<number> {
    let transferred = 0;
    await this.db.transaction(async () => {
      if (await this.transfer.hasDecision()) {
        return;
      }
      const plan = await this.plans.getActive();
      if (!plan || plan.id !== planId) {
        throw new AppError('Active program changed. Please reopen the transfer prompt.', 'progressTransfer.planChanged');
      }
      const history = await this.workouts.listCompletedExerciseResultsOutsidePlan(planId);
      const days = await this.days.listDays(planId);
      for (const day of days) {
        for (const exercise of await this.days.listExercises(day.id)) {
          const result = findMatchingResult(history, exercise);
          if (result) {
            await this.transfer.saveBaselineSets(exercise, result.sets);
            transferred += 1;
          }
        }
      }
      await this.transfer.saveDecision('accepted');
    });
    return transferred;
  }

  async decline(): Promise<void> {
    await this.db.transaction(async () => {
      if (!(await this.transfer.hasDecision())) {
        await this.transfer.saveDecision('declined');
      }
    });
  }
}
