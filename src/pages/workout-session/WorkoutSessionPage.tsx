import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { WorkoutDetails, WorkoutSet } from '@entities/workout/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { RestTimer } from '@features/rest-timer/ui/RestTimer';
import { formatDuration } from '@shared/lib/date';
import { stopTimerSound } from '@shared/lib/timerAlert';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { TextField } from '@shared/ui/TextField';
import { spacing, useThemeColors } from '@shared/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutSession'>;

export const WorkoutSessionPage = ({ route, navigation }: Props) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [edits, setEdits] = useState<Record<string, { weight: string; reps: string }>>({});
  const [activeRestSetId, setActiveRestSetId] = useState<string | null>(null);
  const [activeRestRemainingSec, setActiveRestRemainingSec] = useState<number | null>(null);
  const [activeRestStartedAt, setActiveRestStartedAt] = useState<string | null>(null);
  const [activeRestTargetSec, setActiveRestTargetSec] = useState<number | null>(null);
  const [restEdit, setRestEdit] = useState<{ setId: string; value: string } | null>(null);
  const [restTimerStartKey, setRestTimerStartKey] = useState(0);

  const load = useCallback(async () => {
    const nextDetails = await new WorkoutRepository(db).getDetails(route.params.workoutId);
    setDetails(nextDetails);
    if (nextDetails) {
      const nextEdits: Record<string, { weight: string; reps: string }> = {};
      nextDetails.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          nextEdits[set.id] = { weight: String(set.actualWeight), reps: String(set.actualReps) };
        });
      });
      setEdits(nextEdits);
      const activeRestSet = findActiveRestSet(nextDetails);
      setActiveRestSetId(activeRestSet?.id ?? null);
      setActiveRestStartedAt(activeRestSet?.restStartedAt ?? null);
      setActiveRestTargetSec(activeRestSet?.restTargetSec ?? null);
    }
  }, [db, route.params.workoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  const completeSet = async (setId: string) => {
    const edit = edits[setId];
    if (!edit) {
      return;
    }
    try {
      const repository = new WorkoutRepository(db);
      if (activeRestSetId && activeRestSetId !== setId) {
        await repository.finishRest(activeRestSetId);
      }
      await repository.completeSet(setId, Number(edit.weight), Number(edit.reps));
      if (hasNextSet(details, setId)) {
        setActiveRestSetId(setId);
        setActiveRestRemainingSec(null);
        setActiveRestStartedAt(null);
        setActiveRestTargetSec(null);
        setRestTimerStartKey(current => current + 1);
      } else {
        setActiveRestSetId(null);
        setActiveRestRemainingSec(null);
        setActiveRestStartedAt(null);
        setActiveRestTargetSec(null);
      }
      await load();
    } catch (error) {
      Alert.alert('Cannot complete set', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const finish = async () => {
    try {
      stopTimerSound();
      const repository = new WorkoutRepository(db);
      if (activeRestSetId) {
        await repository.finishRest(activeRestSetId, getElapsedRestSec(activeRestStartedAt, activeRestTargetSec, activeRestRemainingSec));
      }
      await repository.finishSession(route.params.workoutId, 'completed');
      const finishedSession = await repository.getSession(route.params.workoutId);
      if (finishedSession?.status !== 'completed' || !finishedSession.finishedAt) {
        Alert.alert('Cannot finish workout', 'Workout was not saved as completed. Please try again.');
        return;
      }
      setActiveRestSetId(null);
      setActiveRestRemainingSec(null);
      setActiveRestStartedAt(null);
      setActiveRestTargetSec(null);
      navigation.navigate('MainTabs');
    } catch (error) {
      Alert.alert('Cannot finish workout', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const finishActiveRest = async (durationSec: number) => {
    if (!activeRestSetId) {
      return;
    }
    await new WorkoutRepository(db).finishRest(activeRestSetId, durationSec);
    setActiveRestSetId(null);
    setActiveRestRemainingSec(null);
    setActiveRestStartedAt(null);
    setActiveRestTargetSec(null);
    await load();
  };

  const resetActiveRest = async () => {
    if (!activeRestSetId) {
      return;
    }
    await new WorkoutRepository(db).resetRest(activeRestSetId);
    setActiveRestSetId(null);
    setActiveRestRemainingSec(null);
    setActiveRestStartedAt(null);
    setActiveRestTargetSec(null);
    await load();
  };

  const startActiveRest = async (targetSec: number) => {
    if (!activeRestSetId) {
      return;
    }
    await new WorkoutRepository(db).startRest(activeRestSetId, targetSec);
    await load();
  };

  const saveRestEdit = async () => {
    if (!restEdit) {
      return;
    }
    const durationSec = Number(restEdit.value);
    if (!Number.isFinite(durationSec) || durationSec < 0) {
      Alert.alert('Cannot update rest', 'Rest duration must be a non-negative number of seconds.');
      return;
    }
    await new WorkoutRepository(db).updateRestDuration(restEdit.setId, Math.round(durationSec));
    setRestEdit(null);
    await load();
  };

  if (!details) {
    return <Screen title="Workout"><EmptyState text="Workout not found." /></Screen>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 264 }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg }}>
          {details.session.trainingDayNameSnapshot ?? 'Workout'}
        </Text>
        <View style={{ gap: spacing.lg }}>
          {details.exercises.map(exercise => (
            <Card key={exercise.id}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{exercise.nameSnapshot}</Text>
              {exercise.sets.map((set, index) => (
                <View key={set.id} style={{ gap: 8 }}>
                  <Text style={{ color: colors.muted }}>Set {set.setIndex}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <TextField
                        keyboardType="numeric"
                        label="Weight"
                        onChangeText={value =>
                          setEdits(current => ({
                            ...current,
                            [set.id]: { ...(current[set.id] ?? { reps: '0' }), weight: value },
                          }))
                        }
                        value={edits[set.id]?.weight ?? ''}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextField
                        keyboardType="numeric"
                        label="Reps"
                        onChangeText={value =>
                          setEdits(current => ({
                            ...current,
                            [set.id]: { ...(current[set.id] ?? { weight: '0' }), reps: value },
                          }))
                        }
                        value={edits[set.id]?.reps ?? ''}
                      />
                    </View>
                  </View>
                  <Button
                    disabled={set.completed}
                    onPress={() => completeSet(set.id)}
                    variant={set.completed ? 'secondary' : 'primary'}>
                    {set.completed ? 'Completed' : 'Complete set'}
                  </Button>
                  {index < exercise.sets.length - 1 ? (
                    <RestLogRow
                      activeRemainingSec={activeRestSetId === set.id ? activeRestRemainingSec : null}
                      onEdit={() => setRestEdit({ setId: set.id, value: String(set.restDurationSec ?? 0) })}
                      set={set}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          ))}
          <Button onPress={finish}>Finish workout</Button>
        </View>
      </ScrollView>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <RestTimer
          autoStartKey={restTimerStartKey}
          onComplete={durationSec => void finishActiveRest(durationSec)}
          onReset={() => void resetActiveRest()}
          onStarted={durationSec => void startActiveRest(durationSec)}
          onStop={durationSec => void finishActiveRest(durationSec)}
          onTick={setActiveRestRemainingSec}
          resumeStartedAt={activeRestStartedAt}
          resumeTargetSec={activeRestTargetSec}
        />
      </View>
      <Modal animationType="fade" transparent visible={restEdit !== null}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.42)',
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: 12,
              padding: 16,
            }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Edit rest</Text>
            <TextField
              keyboardType="numeric"
              label="Seconds"
              onChangeText={value => setRestEdit(current => (current ? { ...current, value } : current))}
              value={restEdit?.value ?? ''}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setRestEdit(null)} variant="secondary">
                  Cancel
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={() => void saveRestEdit()}>Save</Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface RestLogRowProps {
  activeRemainingSec: number | null;
  onEdit: () => void;
  set: WorkoutSet;
}

const RestLogRow = ({ activeRemainingSec, onEdit, set }: RestLogRowProps) => {
  const colors = useThemeColors();
  const running = Boolean(set.restStartedAt && !set.restFinishedAt);

  const displaySec = running ? activeRemainingSec : set.restDurationSec;

  return (
    <View
      style={{
        minHeight: 40,
        alignItems: 'center',
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800', width: 48 }}>Rest</Text>
      {displaySec !== null ? (
        <Text style={{ color: running ? colors.primary : colors.text, flex: 1, fontSize: 16, fontWeight: '900' }}>
          {formatDuration(displaySec)}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', minWidth: 88, textAlign: 'right' }}>
        {running ? 'Running' : set.restDurationSec !== null ? 'Locked' : 'After complete'}
      </Text>
      {set.restDurationSec !== null ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => ({
            minHeight: 34,
            minWidth: 34,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: colors.secondaryBorder,
            borderRadius: 8,
            borderWidth: 1,
            opacity: pressed ? 0.82 : 1,
          })}>
          <MaterialIcons color={colors.secondaryText} name="edit" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
};

const hasNextSet = (details: WorkoutDetails | null, setId: string): boolean =>
  Boolean(details?.exercises.some(exercise => exercise.sets.some((set, index) => set.id === setId && index < exercise.sets.length - 1)));

const findActiveRestSet = (details: WorkoutDetails): WorkoutSet | null => {
  for (const exercise of details.exercises) {
    const set = exercise.sets.find(candidate => candidate.restStartedAt && !candidate.restFinishedAt);
    if (set) {
      return set;
    }
  }
  return null;
};

const getElapsedRestSec = (startedAt: string | null, targetSec: number | null, remainingSec: number | null): number | undefined => {
  if (startedAt) {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }
  if (targetSec !== null && remainingSec !== null) {
    return Math.max(0, targetSec - remainingSec);
  }
  return undefined;
};
