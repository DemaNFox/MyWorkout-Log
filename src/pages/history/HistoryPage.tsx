import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

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
  const [menuSession, setMenuSession] = useState<WorkoutSession | null>(null);

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
            setMenuSession(null);
            void new WorkoutRepository(db).deleteSession(session.id).then(load).catch(showDeleteError);
          },
        },
      ],
    );
  };

  const confirmClearHistory = () => {
    Alert.alert(
      'Clear history',
      `Delete ${sessions.length} finished workout${sessions.length === 1 ? '' : 's'} for the active plan? This cannot be undone. The plan itself will stay unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete history',
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
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
                {session.trainingDayNameSnapshot ?? 'Workout'}
              </Text>
              <Text style={{ color: colors.muted }}>{session.planNameSnapshot ?? 'No plan'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuSession(session)}
              style={({ pressed }) => ({
                minHeight: 36,
                minWidth: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: colors.secondaryBorder,
                borderRadius: 8,
                borderWidth: 1,
                opacity: pressed ? 0.82 : 1,
              })}>
              <MaterialIcons color={colors.secondaryText} name="more-vert" size={22} />
            </Pressable>
          </View>
          <Text style={{ color: colors.muted }}>{session.startedAt?.slice(0, 10)} - {formatDuration(session.durationSec)}</Text>
          <StatusBadge label={session.status === 'completed' ? 'Complete' : session.status} tone={session.status === 'completed' ? 'success' : 'neutral'} />
        </Card>
      ))}
      <Modal animationType="fade" transparent visible={menuSession !== null}>
        <Pressable
          onPress={() => setMenuSession(null)}
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.42)',
          }}>
          <Pressable
            onPress={event => event.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: 12,
              padding: 16,
            }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              {menuSession?.trainingDayNameSnapshot ?? 'Workout'}
            </Text>
            <Button
              onPress={() => {
                if (!menuSession) {
                  return;
                }
                const workoutId = menuSession.id;
                setMenuSession(null);
                navigation.navigate('WorkoutDetails', { workoutId });
              }}
              variant="secondary">
              Details
            </Button>
            <Button
              onPress={() => {
                if (menuSession) {
                  confirmDeleteSession(menuSession);
                }
              }}
              variant="danger">
              Delete workout
            </Button>
            <Button onPress={() => setMenuSession(null)} variant="secondary">
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const showDeleteError = (error: unknown) => {
  Alert.alert('Cannot delete workout history', error instanceof Error ? error.message : 'Unknown error');
};
