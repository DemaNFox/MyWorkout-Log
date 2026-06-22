import { selectExercisePerformance } from './selectExercisePerformance';

describe('selectExercisePerformance', () => {
  it('uses the repeated working weight instead of a one-set peak', () => {
    expect(
      selectExercisePerformance([
        { actualWeight: 15, actualReps: 12 },
        { actualWeight: 17, actualReps: 10 },
        { actualWeight: 20, actualReps: 6 },
        { actualWeight: 15, actualReps: 10 },
      ]),
    ).toEqual({
      bestWeight: 15,
      repsAtBestWeight: 12,
      setsAtBestWeight: 2,
      bestSingleWeight: 20,
      repsAtBestSingleWeight: 6,
    });
  });

  it('uses the heavier weight when every completed set has a different weight', () => {
    expect(
      selectExercisePerformance([
        { actualWeight: 15, actualReps: 12 },
        { actualWeight: 17, actualReps: 10 },
        { actualWeight: 20, actualReps: 6 },
      ]),
    ).toMatchObject({
      bestWeight: 20,
      repsAtBestWeight: 6,
      setsAtBestWeight: 1,
    });
  });
});
