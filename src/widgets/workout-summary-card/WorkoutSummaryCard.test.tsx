import { render, screen } from '@testing-library/react-native';

import type { WorkoutSession } from '@entities/workout/model/types';

import { WorkoutSummaryCard } from './WorkoutSummaryCard';

describe('WorkoutSummaryCard', () => {
  it('renders empty state', () => {
    render(<WorkoutSummaryCard session={null} />);
    expect(screen.getByText('No workout history yet.')).toBeTruthy();
  });

  it('renders session summary', () => {
    const session: WorkoutSession = {
      id: 'w1',
      sourcePlanId: null,
      sourceTrainingDayId: null,
      planNameSnapshot: 'PPL',
      trainingDayNameSnapshot: 'Push',
      status: 'completed',
      startedAt: '2026-06-15T10:00:00.000Z',
      finishedAt: '2026-06-15T10:45:00.000Z',
      durationSec: 2700,
      createdAt: '2026-06-15T10:00:00.000Z',
      updatedAt: '2026-06-15T10:45:00.000Z',
    };
    render(<WorkoutSummaryCard session={session} />);
    expect(screen.getByText('Push')).toBeTruthy();
    expect(screen.getByText('completed - 45:00')).toBeTruthy();
  });
});
