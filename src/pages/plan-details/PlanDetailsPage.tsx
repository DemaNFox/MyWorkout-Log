import { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { Plan } from '@entities/plan/model/types';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import type { PlannedExercise, TrainingDay } from '@entities/training-day/model/types';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { TextField } from '@shared/ui/TextField';
import { useThemeColors } from '@shared/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanDetails'>;

export const PlanDetailsPage = ({ route, navigation }: Props) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, PlannedExercise[]>>({});
  const [dayName, setDayName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8');
  const [weight, setWeight] = useState('0');

  const load = useCallback(async () => {
    const planRepo = new PlanRepository(db);
    const dayRepo = new TrainingDayRepository(db);
    const nextPlan = await planRepo.getById(route.params.planId);
    const nextDays = await dayRepo.listDays(route.params.planId);
    const pairs = await Promise.all(
      nextDays.map(async day => [day.id, await dayRepo.listExercises(day.id)] as const),
    );
    setPlan(nextPlan);
    setDays(nextDays);
    setExercisesByDay(Object.fromEntries(pairs));
  }, [db, route.params.planId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addDay = async () => {
    try {
      await new TrainingDayRepository(db).createDay(route.params.planId, dayName);
      setDayName('');
      await load();
    } catch (error) {
      Alert.alert('Cannot add day', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const addExercise = async (trainingDayId: string) => {
    try {
      await new TrainingDayRepository(db).addExercise({
        trainingDayId,
        name: exerciseName,
        targetSets: Number(sets),
        targetReps: Number(reps),
        targetWeight: Number(weight),
      });
      setExerciseName('');
      await load();
    } catch (error) {
      Alert.alert('Cannot add exercise', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const activate = async () => {
    await new PlanRepository(db).activate(route.params.planId);
    await load();
  };

  const confirmDeletePlan = () => {
    Alert.alert('Delete plan', `Delete "${plan?.name}" and all planned days/exercises?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void new PlanRepository(db).delete(route.params.planId).then(() => navigation.goBack());
        },
      },
    ]);
  };

  const confirmDeleteExercise = (exercise: PlannedExercise) => {
    Alert.alert('Delete exercise', `Delete "${exercise.name}" from this plan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void new TrainingDayRepository(db).deleteExercise(exercise.id).then(load);
        },
      },
    ]);
  };

  if (!plan) {
    return (
      <Screen title="Plan">
        <EmptyState text="Plan not found." />
      </Screen>
    );
  }

  return (
    <Screen title={plan.name}>
      <Card>
        <Text style={{ color: colors.muted }}>{plan.status}</Text>
        <Button disabled={plan.status === 'active'} onPress={activate} variant={plan.status === 'active' ? 'secondary' : 'primary'}>
          {plan.status === 'active' ? 'Active' : 'Make active'}
        </Button>
        <Button onPress={confirmDeletePlan} variant="danger">Delete plan</Button>
      </Card>
      <Card>
        <TextField label="Training day" onChangeText={setDayName} placeholder="Day 1" value={dayName} />
        <Button disabled={!dayName.trim()} onPress={addDay}>Add day</Button>
      </Card>
      {days.map(day => (
        <Card key={day.id}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{day.name}</Text>
          {(exercisesByDay[day.id] ?? []).map(exercise => (
            <View key={exercise.id} style={{ gap: 8 }}>
              <Text style={{ color: colors.text }}>
                {exercise.order}. {exercise.name} - {exercise.targetSets} x {exercise.targetReps} x{' '}
                {exercise.targetWeight}
              </Text>
              <Button onPress={() => confirmDeleteExercise(exercise)} variant="secondary">
                Delete exercise
              </Button>
            </View>
          ))}
          <View style={{ gap: 8 }}>
            <TextField label="Exercise" onChangeText={setExerciseName} value={exerciseName} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField keyboardType="numeric" label="Sets" onChangeText={setSets} value={sets} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField keyboardType="numeric" label="Reps" onChangeText={setReps} value={reps} />
              </View>
              <View style={{ flex: 1 }}>
                <TextField keyboardType="numeric" label="Weight" onChangeText={setWeight} value={weight} />
              </View>
            </View>
            <Button disabled={!exerciseName.trim()} onPress={() => addExercise(day.id)}>
              Add exercise
            </Button>
          </View>
        </Card>
      ))}
    </Screen>
  );
};
