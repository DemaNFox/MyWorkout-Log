import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

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
import type { ExerciseMetricType } from '@shared/types/domain';

type Props = NativeStackScreenProps<RootStackParamList, 'PlanDetails'>;

export const PlanDetailsPage = ({ route, navigation }: Props) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, PlannedExercise[]>>({});
  const [dayName, setDayName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [metricType, setMetricType] = useState<ExerciseMetricType>('reps');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('8');
  const [weight, setWeight] = useState('0');
  const [exerciseNote, setExerciseNote] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('1');
  const [durationSeconds, setDurationSeconds] = useState('0');
  const [exerciseEdit, setExerciseEdit] = useState<{
    id: string;
    name: string;
    metricType: ExerciseMetricType;
    sets: string;
    reps: string;
    weight: string;
    durationMinutes: string;
    durationSeconds: string;
    note: string;
  } | null>(null);

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
      const targetDurationSec = Number(durationMinutes || 0) * 60 + Number(durationSeconds || 0);
      await new TrainingDayRepository(db).addExercise({
        trainingDayId,
        name: exerciseName,
        metricType,
        targetSets: Number(sets),
        targetReps: metricType === 'reps' ? Number(reps) : 0,
        targetWeight: metricType === 'reps' ? Number(weight) : 0,
        targetDurationSec: metricType === 'duration' ? targetDurationSec : null,
        note: exerciseNote,
      });
      setExerciseName('');
      setExerciseNote('');
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

  const openExerciseEdit = (exercise: PlannedExercise) => {
    const durationSec = exercise.targetDurationSec ?? 0;
    setExerciseEdit({
      id: exercise.id,
      name: exercise.name,
      metricType: exercise.metricType,
      sets: String(exercise.targetSets),
      reps: String(exercise.targetReps),
      weight: String(exercise.targetWeight),
      durationMinutes: String(Math.floor(durationSec / 60)),
      durationSeconds: String(durationSec % 60),
      note: exercise.note ?? '',
    });
  };

  const saveExerciseEdit = async () => {
    if (!exerciseEdit) {
      return;
    }
    try {
      const durationSec =
        Number(exerciseEdit.durationMinutes || 0) * 60 + Number(exerciseEdit.durationSeconds || 0);
      await new TrainingDayRepository(db).updateExercise({
        id: exerciseEdit.id,
        name: exerciseEdit.name,
        metricType: exerciseEdit.metricType,
        targetSets: Number(exerciseEdit.sets),
        targetReps: exerciseEdit.metricType === 'reps' ? Number(exerciseEdit.reps) : 0,
        targetWeight: exerciseEdit.metricType === 'reps' ? Number(exerciseEdit.weight) : 0,
        targetDurationSec: exerciseEdit.metricType === 'duration' ? durationSec : null,
        note: exerciseEdit.note,
      });
      setExerciseEdit(null);
      await load();
    } catch (error) {
      Alert.alert('Cannot update exercise', error instanceof Error ? error.message : 'Unknown error');
    }
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
                {exercise.order}. {exercise.name} — {exercise.targetSets} ×{' '}
                {exercise.metricType === 'duration'
                  ? formatExerciseDuration(exercise.targetDurationSec ?? 0)
                  : `${exercise.targetReps} × ${exercise.targetWeight}`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <ExerciseIconButton
                  icon="edit"
                  label={`Edit ${exercise.name}`}
                  onPress={() => openExerciseEdit(exercise)}
                />
                <ExerciseIconButton
                  danger
                  icon="delete"
                  label={`Delete ${exercise.name}`}
                  onPress={() => confirmDeleteExercise(exercise)}
                />
              </View>
            </View>
          ))}
          <View style={{ gap: 8 }}>
            <TextField label="Exercise" onChangeText={setExerciseName} value={exerciseName} />
            <TextField label="Comment" onChangeText={setExerciseNote} value={exerciseNote} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => setMetricType('reps')}
                  variant={metricType === 'reps' ? 'primary' : 'secondary'}>
                  Reps
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => setMetricType('duration')}
                  variant={metricType === 'duration' ? 'primary' : 'secondary'}>
                  Time
                </Button>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField keyboardType="numeric" label="Sets" onChangeText={setSets} value={sets} />
              </View>
              {metricType === 'reps' ? (
                <>
                  <View style={{ flex: 1 }}>
                    <TextField keyboardType="numeric" label="Reps" onChangeText={setReps} value={reps} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField keyboardType="numeric" label="Weight" onChangeText={setWeight} value={weight} />
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <TextField
                      keyboardType="numeric"
                      label="Minutes"
                      onChangeText={setDurationMinutes}
                      value={durationMinutes}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      keyboardType="numeric"
                      label="Seconds"
                      onChangeText={setDurationSeconds}
                      value={durationSeconds}
                    />
                  </View>
                </>
              )}
            </View>
            <Button disabled={!exerciseName.trim()} onPress={() => addExercise(day.id)}>
              Add exercise
            </Button>
          </View>
        </Card>
      ))}
      <Modal animationType="fade" transparent visible={exerciseEdit !== null}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.42)' }}>
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 12, padding: 16 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Edit exercise</Text>
            <TextField
              label="Exercise"
              onChangeText={value => setExerciseEdit(current => current ? { ...current, name: value } : current)}
              value={exerciseEdit?.name ?? ''}
            />
            <TextField
              label="Comment"
              onChangeText={value => setExerciseEdit(current => current ? { ...current, note: value } : current)}
              value={exerciseEdit?.note ?? ''}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => setExerciseEdit(current => current ? { ...current, metricType: 'reps' } : current)}
                  variant={exerciseEdit?.metricType === 'reps' ? 'primary' : 'secondary'}>
                  Reps
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() => setExerciseEdit(current => current ? { ...current, metricType: 'duration' } : current)}
                  variant={exerciseEdit?.metricType === 'duration' ? 'primary' : 'secondary'}>
                  Time
                </Button>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="numeric"
                  label="Sets"
                  onChangeText={value => setExerciseEdit(current => current ? { ...current, sets: value } : current)}
                  value={exerciseEdit?.sets ?? ''}
                />
              </View>
              {exerciseEdit?.metricType === 'duration' ? (
                <>
                  <View style={{ flex: 1 }}>
                    <TextField
                      keyboardType="numeric"
                      label="Minutes"
                      onChangeText={value => setExerciseEdit(current => current ? { ...current, durationMinutes: value } : current)}
                      value={exerciseEdit.durationMinutes}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      keyboardType="numeric"
                      label="Seconds"
                      onChangeText={value => setExerciseEdit(current => current ? { ...current, durationSeconds: value } : current)}
                      value={exerciseEdit.durationSeconds}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <TextField
                      keyboardType="numeric"
                      label="Reps"
                      onChangeText={value => setExerciseEdit(current => current ? { ...current, reps: value } : current)}
                      value={exerciseEdit?.reps ?? ''}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      keyboardType="numeric"
                      label="Weight"
                      onChangeText={value => setExerciseEdit(current => current ? { ...current, weight: value } : current)}
                      value={exerciseEdit?.weight ?? ''}
                    />
                  </View>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setExerciseEdit(null)} variant="secondary">Cancel</Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={() => void saveExerciseEdit()}>Save</Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const ExerciseIconButton = ({
  danger = false,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  icon: 'delete' | 'edit';
  label: string;
  onPress: () => void;
}) => {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: danger ? colors.danger : colors.secondarySurface,
        borderColor: danger ? colors.danger : colors.secondaryBorder,
        borderRadius: 8,
        borderWidth: 1,
        height: 42,
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        width: 48,
      })}>
      <MaterialIcons color={danger ? colors.primaryText : colors.secondaryText} name={icon} size={21} />
    </Pressable>
  );
};

const formatExerciseDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};
