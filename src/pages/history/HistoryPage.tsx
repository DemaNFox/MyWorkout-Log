import { useCallback, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { WorkoutSession } from '@entities/workout/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { formatDuration } from '@shared/lib/date';
import { Button } from '@shared/ui/Button';
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

  const load = useCallback(async () => {
    setSessions(await new WorkoutRepository(db).listFinishedSessionsForActivePlan());
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmDeleteSession = (session: WorkoutSession) => {
    Alert.alert(
      'Delete workout',
      `Delete "${session.trainingDayNameSnapshot ?? 'Workout'}" from history? Analytics will be recalculated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void new WorkoutRepository(db).deleteSession(session.id).then(load).catch(showDeleteError);
          },
        },
      ],
    );
  };

  const confirmClearHistory = () => {
    Alert.alert(
      'Clear history',
      'Delete all finished workouts for the active plan? The plan itself will stay unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void new WorkoutRepository(db).clearFinishedSessionsForActivePlan().then(load).catch(showDeleteError);
          },
        },
      ],
    );
  };

  return (
    <Screen title="History">
      {sessions.length === 0 ? <EmptyState text="Completed workouts for the active plan will appear here." /> : null}
      {sessions.length > 0 ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>History actions</Text>
          <Button onPress={confirmClearHistory} variant="danger">Clear history</Button>
        </Card>
      ) : null}
      {sessions.map(session => (
        <Card key={session.id}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
            {session.trainingDayNameSnapshot ?? 'Workout'}
          </Text>
          <Text style={{ color: colors.muted }}>{session.planNameSnapshot ?? 'No plan'}</Text>
          <Text style={{ color: colors.muted }}>{session.startedAt?.slice(0, 10)} - {formatDuration(session.durationSec)}</Text>
          <StatusBadge label={session.status} tone={session.status === 'completed' ? 'success' : 'neutral'} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button onPress={() => navigation.navigate('WorkoutDetails', { workoutId: session.id })} variant="secondary">
                Details
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button onPress={() => confirmDeleteSession(session)} variant="danger">
                Delete
              </Button>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
};

const showDeleteError = (error: unknown) => {
  Alert.alert('Cannot delete workout history', error instanceof Error ? error.message : 'Unknown error');
};
