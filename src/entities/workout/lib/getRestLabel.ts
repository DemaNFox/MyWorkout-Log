import type { WorkoutDetails } from '../model/types';

export const getRestLabel = (details: WorkoutDetails | null, setId: string): string | null => {
  if (!details) {
    return null;
  }
  for (const [exerciseIndex, exercise] of details.exercises.entries()) {
    const setIndex = exercise.sets.findIndex(set => set.id === setId);
    if (setIndex === -1) {
      continue;
    }
    if (setIndex < exercise.sets.length - 1) {
      return 'Rest';
    }
    return exerciseIndex < details.exercises.length - 1 ? 'Next exercise' : 'Rest';
  }
  return null;
};
