import { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import type { Plan } from '@entities/plan/model/types';
import type { TrainingDay } from '@entities/training-day/model/types';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
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
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [lastWorkout, setLastWorkout] = useState<WorkoutSession | null>(null);

  const load = useCallback(async () => {
    const workoutRepository = new WorkoutRepository(db);
    const nextActivePlan = await new PlanRepository(db).getActive();
    setActivePlan(nextActivePlan);
    setTrainingDays(
      nextActivePlan
        ? await new TrainingDayRepository(db).listDays(nextActivePlan.id)
        : [],
    );
    setActiveWorkout(await workoutRepository.getOpenSessionForActivePlan());
    setLastWorkout((await workoutRepository.listSessionsForActivePlan(10)).find(session => session.finishedAt) ?? null);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const startWorkout = async (dayId: string) => {
    try {
      const openSession = await new WorkoutRepository(db).getOpenSessionForActivePlan();
      if (openSession) {
        navigation.navigate('WorkoutSession', { workoutId: openSession.id });
        return;
      }
      const session = await new StartWorkoutService(db).startFromActivePlan(dayId);
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
            {activeWorkout ? (
              <Button onPress={() => navigation.navigate('WorkoutSession', { workoutId: activeWorkout.id })}>
                Continue {activeWorkout.trainingDayNameSnapshot ?? 'workout'}
              </Button>
            ) : trainingDays.length > 0 ? (
              <>
                <Text style={{ color: colors.muted }}>Choose a training day:</Text>
                {trainingDays.map(day => (
                  <Button key={day.id} onPress={() => startWorkout(day.id)}>
                    Start {day.name}
                  </Button>
                ))}
              </>
            ) : (
              <EmptyState text="Add at least one training day to the active plan." />
            )}
          </>
        ) : (
          <EmptyState text="Create and activate a plan to start logging workouts offline." />
        )}
      </Card>
      {activeWorkout ? (
        <Card>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Active workout</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
            {activeWorkout.trainingDayNameSnapshot ?? 'Workout'}
          </Text>
          <Text style={{ color: colors.muted }}>{activeWorkout.planNameSnapshot ?? 'Current program'}</Text>
          <Button onPress={() => navigation.navigate('WorkoutSession', { workoutId: activeWorkout.id })}>
            Continue
          </Button>
        </Card>
      ) : null}
      <WorkoutSummaryCard session={lastWorkout} />
    </Screen>
  );
};
