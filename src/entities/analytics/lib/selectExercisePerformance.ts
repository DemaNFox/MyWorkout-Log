export interface CompletedExerciseSet {
  actualWeight: number;
  actualReps: number;
}

export interface ExercisePerformance {
  bestWeight: number;
  repsAtBestWeight: number;
  setsAtBestWeight: number;
  bestSingleWeight: number;
  repsAtBestSingleWeight: number;
}

export const selectExercisePerformance = (sets: CompletedExerciseSet[]): ExercisePerformance | null => {
  if (sets.length === 0) {
    return null;
  }
  const firstSet = sets[0];
  if (!firstSet) {
    return null;
  }

  const bestSingle = sets.reduce((best, set) => {
    if (set.actualWeight > best.actualWeight) {
      return set;
    }
    if (set.actualWeight === best.actualWeight && set.actualReps > best.actualReps) {
      return set;
    }
    return best;
  }, firstSet);

  const byWeight = new Map<number, { weight: number; maxReps: number; sets: number }>();
  sets.forEach(set => {
    const current = byWeight.get(set.actualWeight);
    byWeight.set(set.actualWeight, {
      weight: set.actualWeight,
      maxReps: Math.max(current?.maxReps ?? 0, set.actualReps),
      sets: (current?.sets ?? 0) + 1,
    });
  });

  const weights = [...byWeight.values()];
  const firstWeight = weights[0];
  if (!firstWeight) {
    return null;
  }

  const working = weights.reduce((best, candidate) => {
    if (candidate.sets > best.sets) {
      return candidate;
    }
    if (candidate.sets === best.sets && candidate.weight > best.weight) {
      return candidate;
    }
    if (candidate.sets === best.sets && candidate.weight === best.weight && candidate.maxReps > best.maxReps) {
      return candidate;
    }
    return best;
  }, firstWeight);

  return {
    bestWeight: working.weight,
    repsAtBestWeight: working.maxReps,
    setsAtBestWeight: working.sets,
    bestSingleWeight: bestSingle.actualWeight,
    repsAtBestSingleWeight: bestSingle.actualReps,
  };
};
