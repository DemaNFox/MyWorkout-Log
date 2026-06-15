import { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import type { Plan } from '@entities/plan/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import type { WorkoutSession } from '@entities/workout/model/types';
import { StartWorkoutService } from '@features/workout-start/model/startWorkoutService';
import { useDatabase } from '@app/providers/DatabaseProvider';
import { WorkoutSummaryCard } from '@widgets/workout-summary-card/WorkoutSummaryCard';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { useThemeColors } from '@shared/ui/theme';

export const HomePage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [lastWorkout, setLastWorkout] = useState<WorkoutSession | null>(null);

  const load = useCallback(async () => {
    setActivePlan(await new PlanRepository(db).getActive());
    setLastWorkout((await new WorkoutRepository(db).listSessionsForActivePlan(1))[0] ?? null);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const startWorkout = async () => {
    try {
      const session = await new StartWorkoutService(db).startFromActivePlan();
      navigation.navigate('WorkoutSession', { workoutId: session.id });
    } catch (error) {
      Alert.alert('Cannot start workout', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Screen title="Today">
      <Card>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>Active plan</Text>
        {activePlan ? (
          <>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{activePlan.name}</Text>
            <Button onPress={startWorkout}>Start workout</Button>
          </>
        ) : (
          <EmptyState text="Create and activate a plan to start logging workouts offline." />
        )}
      </Card>
      <WorkoutSummaryCard session={lastWorkout} />
    </Screen>
  );
};
