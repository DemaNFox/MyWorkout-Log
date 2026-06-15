import { Text } from 'react-native';

import type { WorkoutSession } from '@entities/workout/model/types';
import { formatDuration } from '@shared/lib/date';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { useThemeColors } from '@shared/ui/theme';

interface WorkoutSummaryCardProps {
  session: WorkoutSession | null;
}

export const WorkoutSummaryCard = ({ session }: WorkoutSummaryCardProps) => {
  const colors = useThemeColors();

  return (
    <Card>
      <Text style={{ color: colors.muted, fontWeight: '700' }}>Last workout</Text>
      {session ? (
        <>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
            {session.trainingDayNameSnapshot ?? 'Workout'}
          </Text>
          <Text style={{ color: colors.muted }}>
            {session.status} - {formatDuration(session.durationSec)}
          </Text>
        </>
      ) : (
        <EmptyState text="No workout history yet." />
      )}
    </Card>
  );
};
