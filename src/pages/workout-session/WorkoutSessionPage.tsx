import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
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
import { useLayoutMetrics } from '@shared/ui/layout';
import { spacing, useThemeColors } from '@shared/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutSession'>;
const workoutScrollOffsets = new Map<string, number>();

export const WorkoutSessionPage = ({ route, navigation }: Props) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const layout = useLayoutMetrics();
  const scrollRef = useRef<ScrollView | null>(null);
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [edits, setEdits] = useState<Record<string, { weight: string; reps: string }>>({});
  const [setEdit, setSetEdit] = useState<{
    setId: string;
    weight: string;
    reps: string;
    restMinutes: string;
    restSeconds: string;
    canEditRest: boolean;
  } | null>(null);
  const [activeRestSetId, setActiveRestSetId] = useState<string | null>(null);
  const [activeRestRemainingSec, setActiveRestRemainingSec] = useState<number | null>(null);
  const [activeRestStartedAt, setActiveRestStartedAt] = useState<string | null>(null);
  const [activeRestTargetSec, setActiveRestTargetSec] = useState<number | null>(null);
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

  useEffect(() => {
    const offset = workoutScrollOffsets.get(route.params.workoutId);
    if (offset === undefined) {
      return;
    }
    const timeoutId = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: false });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [details, route.params.workoutId]);

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
      if (hasNextWorkoutStep(details, setId)) {
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

  const openSetEdit = (set: WorkoutSet, canEditRest: boolean) => {
    const restSec = getEditableRestSec(set, activeRestTargetSec);
    setSetEdit({
      setId: set.id,
      weight: String(set.actualWeight),
      reps: String(set.actualReps),
      restMinutes: String(Math.floor(restSec / 60)),
      restSeconds: String(restSec % 60),
      canEditRest,
    });
  };

  const saveSetEdit = async () => {
    const edit = setEdit;
    if (!edit) {
      return;
    }
    const weight = Number(edit.weight);
    const reps = Number(edit.reps);
    const restSec = getSecondsFromParts(edit.restMinutes, edit.restSeconds);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 0) {
      Alert.alert('Cannot update set', 'Weight and reps must be non-negative numbers.');
      return;
    }
    if (edit.canEditRest && restSec === null) {
      Alert.alert('Cannot update rest', 'Rest time must use non-negative minutes and 0-59 seconds.');
      return;
    }
    try {
      const repository = new WorkoutRepository(db);
      const currentSet = details?.exercises.flatMap(exercise => exercise.sets).find(set => set.id === edit.setId);
      await repository.updateCompletedSetResult(edit.setId, weight, reps);
      if (edit.canEditRest && restSec !== null) {
        if (activeRestSetId === edit.setId && currentSet?.restStartedAt && !currentSet.restFinishedAt) {
          await repository.updateRestTarget(edit.setId, restSec);
          setActiveRestTargetSec(restSec);
        } else {
          await repository.updateRestDuration(edit.setId, restSec);
        }
      }
      setSetEdit(null);
      await load();
    } catch (error) {
      Alert.alert('Cannot update set', error instanceof Error ? error.message : 'Unknown error');
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

  const updateActiveRestTarget = async (targetSec: number) => {
    if (!activeRestSetId) {
      return;
    }
    setActiveRestTargetSec(targetSec);
    await new WorkoutRepository(db).updateRestTarget(activeRestSetId, targetSec);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    workoutScrollOffsets.set(route.params.workoutId, event.nativeEvent.contentOffset.y);
  };

  if (!details) {
    return <Screen title="Workout"><EmptyState text="Workout not found." /></Screen>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: 144 }}
        onScroll={handleScroll}
        ref={scrollRef}
        scrollEventThrottle={250}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg }}>
          {details.session.trainingDayNameSnapshot ?? 'Workout'}
        </Text>
        <View style={{ gap: spacing.lg }}>
          {details.exercises.map(exercise => (
            <Card key={exercise.id}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{exercise.nameSnapshot}</Text>
              {exercise.sets.map(set => {
                const restLabel = getRestLabel(details, set.id);
                const setEditable = !set.completed;

                return (
                <View key={set.id} style={{ gap: 8 }}>
                  <Text style={{ color: colors.muted }}>Set {set.setIndex}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <TextField
                        editable={setEditable}
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
                        editable={setEditable}
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
                  {set.completed ? (
                    <CompletedSetSummary
                      activeRemainingSec={activeRestSetId === set.id ? activeRestRemainingSec : null}
                      onEdit={() => openSetEdit(set, restLabel !== null)}
                      restLabel={restLabel}
                      set={set}
                    />
                  ) : (
                    <Button onPress={() => completeSet(set.id)}>Complete set</Button>
                  )}
                </View>
                );
              })}
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
          onTargetChanged={durationSec => void updateActiveRestTarget(durationSec)}
          onTick={setActiveRestRemainingSec}
          resumeStartedAt={activeRestStartedAt}
          resumeTargetSec={activeRestTargetSec}
        />
      </View>
      <Modal animationType="fade" transparent visible={setEdit !== null}>
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
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Edit set</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="numeric"
                  label="Weight"
                  onChangeText={value => setSetEdit(current => (current ? { ...current, weight: value } : current))}
                  value={setEdit?.weight ?? ''}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="numeric"
                  label="Reps"
                  onChangeText={value => setSetEdit(current => (current ? { ...current, reps: value } : current))}
                  value={setEdit?.reps ?? ''}
                />
              </View>
            </View>
            {setEdit?.canEditRest ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    keyboardType="numeric"
                    label="Rest min"
                    onChangeText={value =>
                      setSetEdit(current => (current ? { ...current, restMinutes: value } : current))
                    }
                    value={setEdit.restMinutes}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    keyboardType="numeric"
                    label="Rest sec"
                    onChangeText={value =>
                      setSetEdit(current => (current ? { ...current, restSeconds: value } : current))
                    }
                    value={setEdit.restSeconds}
                  />
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setSetEdit(null)} variant="secondary">
                  Cancel
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={() => void saveSetEdit()}>Save</Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface CompletedSetSummaryProps {
  activeRemainingSec: number | null;
  onEdit: () => void;
  restLabel: string | null;
  set: WorkoutSet;
}

const CompletedSetSummary = ({ activeRemainingSec, onEdit, restLabel, set }: CompletedSetSummaryProps) => {
  const colors = useThemeColors();
  const running = Boolean(set.restStartedAt && !set.restFinishedAt);
  const displaySec = running ? activeRemainingSec : set.restDurationSec;
  const restText = restLabel
    ? `${restLabel}: ${displaySec !== null ? formatDuration(displaySec) : 'not logged'}`
    : 'No rest';
  const statusText = running ? 'Running' : displaySec !== null ? 'Locked' : 'Completed';

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
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <Text style={{ color: colors.success, fontSize: 13, fontWeight: '900' }}>Completed</Text>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>
            {set.actualWeight} x {set.actualReps}
          </Text>
        </View>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <Text style={{ color: running ? colors.primary : colors.muted, fontSize: 12, fontWeight: '800' }}>
            {restText}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{statusText}</Text>
        </View>
      </View>
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
    </View>
  );
};

const hasNextWorkoutStep = (details: WorkoutDetails | null, setId: string): boolean =>
  getRestLabel(details, setId) !== null;

const getRestLabel = (details: WorkoutDetails | null, setId: string): string | null => {
  if (!details) {
    return null;
  }
  for (const [exerciseIndex, exercise] of details.exercises.entries()) {
    const setIndex = exercise.sets.findIndex(set => set.id === setId);
    if (setIndex === -1) {
      continue;
    }
    if (setIndex < exercise.sets.length - 1) {
      return 'Rest';
    }
    if (exerciseIndex < details.exercises.length - 1) {
      return 'Next exercise';
    }
    return null;
  }
  return null;
};

const getEditableRestSec = (set: WorkoutSet, activeRestTargetSec: number | null): number => {
  if (set.restStartedAt && !set.restFinishedAt) {
    return activeRestTargetSec ?? set.restTargetSec ?? set.restDurationSec ?? 0;
  }
  return set.restDurationSec ?? set.restTargetSec ?? 0;
};

const getSecondsFromParts = (minutes: string, seconds: string): number | null => {
  const parsedMinutes = minutes.trim() === '' ? 0 : Number(minutes);
  const parsedSeconds = seconds.trim() === '' ? 0 : Number(seconds);
  if (
    !Number.isFinite(parsedMinutes) ||
    !Number.isFinite(parsedSeconds) ||
    parsedMinutes < 0 ||
    parsedSeconds < 0 ||
    parsedSeconds >= 60
  ) {
    return null;
  }
  return Math.round(parsedMinutes) * 60 + Math.round(parsedSeconds);
};

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
