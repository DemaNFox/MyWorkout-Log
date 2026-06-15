import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import type { Database } from '@shared/db/types';

const program = [
  {
    day: 'Push',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 8, weight: 80 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 28 },
      { name: 'Overhead Press', sets: 3, reps: 8, weight: 45 },
      { name: 'Cable Triceps Pushdown', sets: 3, reps: 12, weight: 35 },
    ],
  },
  {
    day: 'Pull',
    exercises: [
      { name: 'Barbell Row', sets: 4, reps: 8, weight: 70 },
      { name: 'Lat Pulldown', sets: 3, reps: 10, weight: 60 },
      { name: 'Seated Cable Row', sets: 3, reps: 10, weight: 55 },
      { name: 'Dumbbell Curl', sets: 3, reps: 12, weight: 16 },
    ],
  },
  {
    day: 'Legs',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 6, weight: 100 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weight: 90 },
      { name: 'Leg Press', sets: 3, reps: 12, weight: 160 },
      { name: 'Standing Calf Raise', sets: 4, reps: 15, weight: 70 },
    ],
  },
];

export const seedMockProgram = async (db: Database): Promise<void> => {
  const plans = new PlanRepository(db);
  const existingPlans = await plans.list();
  if (existingPlans.length > 0) {
    return;
  }

  const days = new TrainingDayRepository(db);
  const plan = await plans.create('Mock Push Pull Legs');

  for (const dayPayload of program) {
    const day = await days.createDay(plan.id, dayPayload.day);
    for (const exercise of dayPayload.exercises) {
      await days.addExercise({
        trainingDayId: day.id,
        name: exercise.name,
        targetSets: exercise.sets,
        targetReps: exercise.reps,
        targetWeight: exercise.weight,
        note: null,
      });
    }
  }

  await plans.activate(plan.id);
};
