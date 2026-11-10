import { fireEvent, render } from '@testing-library/react-native';

import type { ExerciseHistoryRow } from '../model/types';
import { ExerciseProgressChart } from './ExerciseProgressChart';

const row = (id: string, date: string, weight: number, reps: number): ExerciseHistoryRow => ({
  workoutSessionId: id,
  workoutExerciseId: id,
  date,
  bestWeight: weight,
  repsAtBestWeight: reps,
  setsAtBestWeight: 1,
  bestSingleWeight: weight,
  repsAtBestSingleWeight: reps,
  completedSets: 1,
  trend: 'none',
});

it('shows the selected workout and switches the displayed metric', () => {
  const screen = render(<ExerciseProgressChart rows={[
    row('first', '2026-09-01T10:00:00Z', 60, 10),
    row('latest', '2026-11-10T10:00:00Z', 75, 8),
  ]} />);

  expect(screen.getByLabelText('График веса. Выбрано 10.11.2026: 75 кг')).toBeTruthy();
  fireEvent.press(screen.getByTestId('chart-point-0'));
  expect(screen.getByLabelText('График веса. Выбрано 01.09.2026: 60 кг')).toBeTruthy();

  fireEvent.press(screen.getByText('Повторения'));
  expect(screen.getByLabelText('График повторений. Выбрано 01.09.2026: 10 повт.')).toBeTruthy();
});
