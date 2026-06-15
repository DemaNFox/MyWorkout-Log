import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { WorkoutSession } from '@entities/workout/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { formatDuration } from '@shared/lib/date';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { StatusBadge } from '@shared/ui/StatusBadge';
import { useThemeColors } from '@shared/ui/theme';

export const HistoryPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      void new WorkoutRepository(db).listSessionsForActivePlan().then(setSessions);
    }, [db]),
  );

  return (
    <Screen title="History">
      {sessions.length === 0 ? <EmptyState text="Completed workouts for the active plan will appear here." /> : null}
      {sessions.map(session => (
        <Pressable key={session.id} onPress={() => navigation.navigate('WorkoutDetails', { workoutId: session.id })}>
          <Card>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              {session.trainingDayNameSnapshot ?? 'Workout'}
            </Text>
            <Text style={{ color: colors.muted }}>{session.planNameSnapshot ?? 'No plan'}</Text>
            <Text style={{ color: colors.muted }}>{session.startedAt?.slice(0, 10)} · {formatDuration(session.durationSec)}</Text>
            <StatusBadge label={session.status} tone={session.status === 'completed' ? 'success' : 'neutral'} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
};
