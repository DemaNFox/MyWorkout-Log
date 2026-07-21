import {
  findExerciseByName,
  getExerciseById,
  getExercisesByMuscle,
  searchExercises,
} from './exerciseCatalog';

describe('exerciseCatalog', () => {
  it('resolves stable IDs by name and alias', () => {
    expect(findExerciseByName('  ЖИМ   ГАНТЕЛЕЙ ЛЁЖА ')?.id).toBe('dumbbell-bench-press');
    expect(getExerciseById('plank')?.defaultMeasurementType).toBe('duration');
  });

  it('searches catalog metadata without exposing the JSON source', () => {
    expect(searchExercises('row').map(exercise => exercise.id)).toContain('dumbbell-row');
    expect(getExercisesByMuscle('chest').length).toBeGreaterThan(0);
  });
});
