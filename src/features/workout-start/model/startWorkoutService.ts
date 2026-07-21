import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import type { WorkoutSession } from '@entities/workout/model/types';
import type { Database } from '@shared/db/types';
import { AppError } from '@shared/lib/errors';

export class StartWorkoutService {
  private readonly plans: PlanRepository;
  private readonly days: TrainingDayRepository;
  private readonly workouts: WorkoutRepository;

  constructor(db: Database) {
    this.plans = new PlanRepository(db);
    this.days = new TrainingDayRepository(db);
    this.workouts = new WorkoutRepository(db);
  }

  async startFromActivePlan(dayId?: string): Promise<WorkoutSession> {
    const activePlan = await this.plans.getActive();
    if (!activePlan) {
      throw new AppError('No active plan selected', 'workout.noActivePlan');
    }
    const days = await this.days.listDays(activePlan.id);
    const selectedDay = dayId ? days.find(day => day.id === dayId) : days[0];
    if (!selectedDay) {
      throw new AppError('Training day not found', 'workout.trainingDayNotFound');
    }
    const plannedExercises = await this.days.listExercises(selectedDay.id);
    const session = await this.workouts.createSession({
      sourcePlanId: activePlan.id,
      sourceTrainingDayId: selectedDay.id,
      planNameSnapshot: activePlan.name,
      trainingDayNameSnapshot: selectedDay.name,
    });
    for (const exercise of plannedExercises) {
      const previousSets = await this.workouts.getLatestCompletedExerciseSets(
        activePlan.id,
        exercise.id,
        exercise.name,
      );
      const workoutExercise = await this.workouts.addExercise({
        workoutSessionId: session.id,
        sourcePlannedExerciseId: exercise.id,
        exerciseId: exercise.exerciseId,
        nameSnapshot: exercise.name,
        noteSnapshot: exercise.note,
        metricType: exercise.metricType,
        measurementType: exercise.measurementType,
        weightMode: exercise.weightMode,
        order: exercise.order,
      });
      for (let setIndex = 1; setIndex <= exercise.targetSets; setIndex += 1) {
        const previousSet = previousSets[setIndex - 1] ?? previousSets[previousSets.length - 1];
        await this.workouts.addSet({
          workoutExerciseId: workoutExercise.id,
          setIndex,
          targetWeight: exercise.targetWeight,
          targetReps: exercise.targetReps,
          targetDurationSec: exercise.targetDurationSec,
          actualWeight: previousSet?.actualWeight ?? exercise.targetWeight,
          actualReps: previousSet?.actualReps ?? exercise.targetReps,
          actualDurationSec: previousSet?.actualDurationSec ?? exercise.targetDurationSec,
        });
      }
    }
    return session;
  }
}
