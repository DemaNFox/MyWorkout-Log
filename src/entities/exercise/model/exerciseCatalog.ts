import rawExercises from '../data/exercises.json';

import type { Exercise, MovementType, MuscleGroup } from './types';

const exercises = rawExercises as Exercise[];

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const getAllExercises = (): Exercise[] => exercises.map(exercise => ({ ...exercise }));

export const getExerciseById = (exerciseId: string): Exercise | undefined =>
  exercises.find(exercise => exercise.id === exerciseId);

export const findExerciseByName = (name: string): Exercise | undefined => {
  const query = normalize(name);
  return exercises.find(
    exercise =>
      normalize(exercise.name) === query ||
      exercise.aliases?.some(alias => normalize(alias) === query),
  );
};

export const searchExercises = (query: string): Exercise[] => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return getAllExercises();
  }
  return exercises.filter(exercise =>
    [exercise.name, ...(exercise.aliases ?? [])].some(name => normalize(name).includes(normalizedQuery)),
  );
};

export const getExercisesByMuscle = (muscle: MuscleGroup): Exercise[] =>
  exercises.filter(
    exercise =>
      exercise.primaryMuscles.includes(muscle) || exercise.secondaryMuscles?.includes(muscle),
  );

export const getExercisesByMovementType = (movementType: MovementType): Exercise[] =>
  exercises.filter(exercise => exercise.movementType === movementType);
