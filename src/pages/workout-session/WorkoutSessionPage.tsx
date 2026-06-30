import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import { getRestLabel } from '@entities/workout/lib/getRestLabel';
import type { WorkoutDetails, WorkoutExercise, WorkoutSet } from '@entities/workout/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { RestTimer } from '@features/rest-timer/ui/RestTimer';
import { ExerciseNoteField } from '@features/workout-note/ui/ExerciseNoteField';
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
  const exerciseOffsetsRef = useRef(new Map<string, number>());
  const restorePendingRef = useRef(true);
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [editingExerciseNoteId, setEditingExerciseNoteId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, {
    weight: string;
    reps: string;
    durationMinutes: string;
    durationSeconds: string;
    durationInput: string;
  }>>({});
  const [setEdit, setSetEdit] = useState<{
    setId: string;
    metricType: WorkoutExercise['metricType'];
    weight: string;
    reps: string;
    durationMinutes: string;
    durationSeconds: string;
    restMinutes: string;
    restSeconds: string;
    canEditRest: boolean;
  } | null>(null);
  const [activeRestSetId, setActiveRestSetId] = useState<string | null>(null);
  const [activeRestRemainingSec, setActiveRestRemainingSec] = useState<number | null>(null);
  const [activeRestStartedAt, setActiveRestStartedAt] = useState<string | null>(null);
  const [activeRestTargetSec, setActiveRestTargetSec] = useState<number | null>(null);
  const [restTimerStartKey, setRestTimerStartKey] = useState(0);
  const [activeExerciseSetId, setActiveExerciseSetId] = useState<string | null>(null);
  const [exerciseElapsedSec, setExerciseElapsedSec] = useState(0);

  const load = useCallback(async () => {
    const nextDetails = await new WorkoutRepository(db).getDetails(route.params.workoutId);
    setDetails(nextDetails);
    if (nextDetails) {
      const nextEdits: typeof edits = {};
      nextDetails.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          const durationSec = set.actualDurationSec ?? set.targetDurationSec ?? 0;
          nextEdits[set.id] = {
            weight: String(set.actualWeight),
            reps: String(set.actualReps),
            durationMinutes: String(Math.floor(durationSec / 60)),
            durationSeconds: String(durationSec % 60),
            durationInput: formatDurationInput(durationSec),
          };
        });
      });
      setEdits(nextEdits);
      setExerciseNotes(
        Object.fromEntries(nextDetails.exercises.map(exercise => [exercise.id, exercise.noteSnapshot ?? ''])),
      );
      const activeRestSet = findActiveRestSet(nextDetails);
      setActiveRestSetId(activeRestSet?.id ?? null);
      setActiveRestStartedAt(activeRestSet?.restStartedAt ?? null);
      setActiveRestTargetSec(activeRestSet?.restTargetSec ?? null);
      const activeExerciseSet = findActiveExerciseSet(nextDetails);
      setActiveExerciseSetId(activeExerciseSet?.id ?? null);
      setExerciseElapsedSec(getExerciseElapsedSec(activeExerciseSet?.exerciseStartedAt ?? null));
    }
  }, [db, route.params.workoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    restorePendingRef.current = true;
    exerciseOffsetsRef.current.clear();
  }, [route.params.workoutId]);

  useEffect(() => {
    if (!activeExerciseSetId) {
      return undefined;
    }
    const activeSet = details?.exercises
      .flatMap(exercise => exercise.sets)
      .find(set => set.id === activeExerciseSetId);
    if (!activeSet?.exerciseStartedAt) {
      return undefined;
    }
    const updateElapsed = () => {
      setExerciseElapsedSec(getExerciseElapsedSec(activeSet.exerciseStartedAt));
    };
    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [activeExerciseSetId, details]);

  const completeSet = async (setId: string) => {
    const edit = edits[setId];
    const exercise = details?.exercises.find(candidate => candidate.sets.some(set => set.id === setId));
    if (!edit || !exercise) {
      return;
    }
    try {
      const enteredDurationSec = parseDurationInput(edit.durationInput);
      const completedDurationSec =
        exercise.metricType === 'duration' && activeExerciseSetId === setId
          ? exerciseElapsedSec
          : enteredDurationSec;
      if (exercise.metricType === 'duration' && (completedDurationSec === null || completedDurationSec <= 0)) {
        Alert.alert('Cannot complete set', 'Duration must be greater than zero.');
        return;
      }
      const repository = new WorkoutRepository(db);
      if (activeExerciseSetId === setId) {
        await repository.stopExerciseTimer(setId, exerciseElapsedSec);
      }
      if (activeRestSetId && activeRestSetId !== setId) {
        await repository.finishRest(activeRestSetId);
      }
      await repository.completeSet(
        setId,
        exercise.metricType === 'reps' ? Number(edit.weight) : 0,
        exercise.metricType === 'reps' ? Number(edit.reps) : 0,
        exercise.metricType === 'duration' ? completedDurationSec : null,
      );
      setActiveExerciseSetId(null);
      setExerciseElapsedSec(0);
      setActiveRestSetId(setId);
      setActiveRestRemainingSec(null);
      setActiveRestStartedAt(null);
      setActiveRestTargetSec(null);
      setRestTimerStartKey(current => current + 1);
      await load();
    } catch (error) {
      Alert.alert('Cannot complete set', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const openSetEdit = (exercise: WorkoutExercise, set: WorkoutSet, canEditRest: boolean) => {
    const restSec = getEditableRestSec(set, activeRestTargetSec);
    const durationSec = set.actualDurationSec ?? set.targetDurationSec ?? 0;
    setSetEdit({
      setId: set.id,
      metricType: exercise.metricType,
      weight: String(set.actualWeight),
      reps: String(set.actualReps),
      durationMinutes: String(Math.floor(durationSec / 60)),
      durationSeconds: String(durationSec % 60),
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
    const durationSec = getSecondsFromParts(edit.durationMinutes, edit.durationSeconds);
    const restSec = getSecondsFromParts(edit.restMinutes, edit.restSeconds);
    if (edit.metricType === 'reps' && (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 0)) {
      Alert.alert('Cannot update set', 'Weight and reps must be non-negative numbers.');
      return;
    }
    if (edit.metricType === 'duration' && (durationSec === null || durationSec <= 0)) {
      Alert.alert('Cannot update set', 'Duration must be greater than zero.');
      return;
    }
    if (edit.canEditRest && restSec === null) {
      Alert.alert('Cannot update rest', 'Rest time must use non-negative minutes and 0-59 seconds.');
      return;
    }
    try {
      const repository = new WorkoutRepository(db);
      const currentSet = details?.exercises.flatMap(exercise => exercise.sets).find(set => set.id === edit.setId);
      await repository.updateCompletedSetResult(
        edit.setId,
        edit.metricType === 'reps' ? weight : 0,
        edit.metricType === 'reps' ? reps : 0,
        edit.metricType === 'duration' ? durationSec : null,
      );
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

  const confirmCancelWorkout = () => {
    Alert.alert(
      'Cancel workout',
      'Cancel this workout? Its sets and notes from this session will be deleted.',
      [
        { text: 'Keep workout', style: 'cancel' },
        {
          text: 'Cancel workout',
          style: 'destructive',
          onPress: () => {
            stopTimerSound();
            void new WorkoutRepository(db)
              .deleteSession(route.params.workoutId)
              .then(() => navigation.navigate('MainTabs'))
              .catch(error => {
                Alert.alert('Cannot cancel workout', error instanceof Error ? error.message : 'Unknown error');
              });
          },
        },
      ],
    );
  };

  const saveExerciseNote = async (exerciseId: string) => {
    try {
      await new WorkoutRepository(db).updateExerciseNote(exerciseId, exerciseNotes[exerciseId] ?? '');
      setEditingExerciseNoteId(null);
      await load();
    } catch (error) {
      Alert.alert('Cannot save comment', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const toggleExerciseTimer = async (set: WorkoutSet) => {
    const repository = new WorkoutRepository(db);
    try {
      if (activeExerciseSetId === set.id) {
        await repository.stopExerciseTimer(set.id, exerciseElapsedSec);
        setActiveExerciseSetId(null);
        setExerciseElapsedSec(0);
        await load();
        return;
      }
      if (activeExerciseSetId) {
        await repository.stopExerciseTimer(activeExerciseSetId, exerciseElapsedSec);
      }
      const durationSec = parseDurationInput(edits[set.id]?.durationInput ?? '');
      if (durationSec === null || durationSec <= 0) {
        Alert.alert('Cannot start timer', 'Enter a duration greater than zero in mm:ss format.');
        return;
      }
      await repository.updatePendingSetValues(set.id, {
        actualWeight: 0,
        actualReps: 0,
        actualDurationSec: durationSec,
        targetDurationSec: durationSec,
      });
      await repository.startExerciseTimer(set.id);
      setActiveExerciseSetId(set.id);
      setExerciseElapsedSec(0);
      await load();
    } catch (error) {
      Alert.alert('Cannot start timer', error instanceof Error ? error.message : 'Unknown error');
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

  const handleExerciseLayout = (exerciseId: string, event: LayoutChangeEvent) => {
    exerciseOffsetsRef.current.set(exerciseId, event.nativeEvent.layout.y);
    restoreWorkoutPosition();
  };

  const restoreWorkoutPosition = () => {
    if (!details || !restorePendingRef.current) {
      return;
    }
    const savedOffset = workoutScrollOffsets.get(route.params.workoutId);
    const currentExercise = details.exercises.find(exercise => exercise.sets.some(set => !set.completed));
    const currentExerciseOffset = currentExercise ? exerciseOffsetsRef.current.get(currentExercise.id) : undefined;
    const targetOffset = currentExerciseOffset ?? savedOffset;
    if (targetOffset === undefined) {
      return;
    }
    restorePendingRef.current = false;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, targetOffset - spacing.md), animated: false });
    });
  };

  if (!details) {
    return <Screen title="Workout"><EmptyState text="Workout not found." /></Screen>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: 144 }}
        onContentSizeChange={restoreWorkoutPosition}
        onScroll={handleScroll}
        ref={scrollRef}
        scrollEventThrottle={250}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg }}>
          {details.session.trainingDayNameSnapshot ?? 'Workout'}
        </Text>
        <View style={{ gap: spacing.lg }}>
          {details.exercises.map(exercise => (
            <View key={exercise.id} onLayout={event => handleExerciseLayout(exercise.id, event)}>
            <Card>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{exercise.nameSnapshot}</Text>
              {exercise.sets.map(set => {
                const restLabel = getRestLabel(details, set.id);
                const setEditable = !set.completed && activeExerciseSetId !== set.id;

                return (
                <View key={set.id} style={{ gap: 8 }}>
                  <Text style={{ color: colors.muted }}>Set {set.setIndex}</Text>
                  {exercise.metricType === 'reps' ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <TextField
                        editable={setEditable}
                        keyboardType="numeric"
                        label="Weight"
                        onChangeText={value =>
                          setEdits(current => ({
                            ...current,
                            [set.id]: {
                              ...(current[set.id] ?? emptySetEdit()),
                              weight: value,
                            },
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
                            [set.id]: {
                              ...(current[set.id] ?? emptySetEdit()),
                              reps: value,
                            },
                          }))
                        }
                        value={edits[set.id]?.reps ?? ''}
                      />
                    </View>
                  </View>
                  ) : (
                    <TextField
                      editable={setEditable}
                      label="Time (mm:ss)"
                      onChangeText={value =>
                        setEdits(current => ({
                          ...current,
                          [set.id]: {
                            ...(current[set.id] ?? emptySetEdit()),
                            durationInput: sanitizeDurationInput(value),
                          },
                        }))
                      }
                      value={edits[set.id]?.durationInput ?? ''}
                    />
                  )}
                  {set.completed ? (
                    <CompletedSetSummary
                      activeRemainingSec={activeRestSetId === set.id ? activeRestRemainingSec : null}
                      exercise={exercise}
                      onEdit={() => openSetEdit(exercise, set, restLabel !== null)}
                      restLabel={restLabel}
                      set={set}
                    />
                  ) : (
                    exercise.metricType === 'duration' ? (
                      <>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                          Exercise timer: {formatDuration(activeExerciseSetId === set.id ? exerciseElapsedSec : set.actualDurationSec)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Button onPress={() => completeSet(set.id)}>Complete set</Button>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button
                              onPress={() => void toggleExerciseTimer(set)}
                              variant={activeExerciseSetId === set.id ? 'secondary' : 'primary'}>
                              {activeExerciseSetId === set.id ? 'Stop time' : 'Start time'}
                            </Button>
                          </View>
                        </View>
                      </>
                    ) : (
                      <Button onPress={() => completeSet(set.id)}>Complete set</Button>
                    )
                  )}
                </View>
                );
              })}
              <ExerciseNoteField
                dirty={isExerciseNoteDirty(exercise, exerciseNotes)}
                editing={editingExerciseNoteId === exercise.id}
                onChangeText={value =>
                  setExerciseNotes(current => ({ ...current, [exercise.id]: value }))
                }
                onEdit={() => setEditingExerciseNoteId(exercise.id)}
                onSave={() => {
                  if (isExerciseNoteDirty(exercise, exerciseNotes)) {
                    void saveExerciseNote(exercise.id);
                  } else {
                    setEditingExerciseNoteId(null);
                  }
                }}
                value={exerciseNotes[exercise.id] ?? ''}
              />
            </Card>
            </View>
          ))}
          <Button onPress={finish}>Finish workout</Button>
          <Button onPress={confirmCancelWorkout} variant="danger">Cancel workout</Button>
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
            {setEdit?.metricType === 'reps' ? (
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
            ) : (
              <TextField
                label="Time (mm:ss)"
                onChangeText={value =>
                  setSetEdit(current => {
                    if (!current) {
                      return current;
                    }
                    const parts = parseDurationParts(value);
                    return { ...current, ...parts };
                  })
                }
                value={formatDurationParts(
                  setEdit?.durationMinutes ?? '0',
                  setEdit?.durationSeconds ?? '0',
                )}
              />
            )}
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
  exercise: WorkoutExercise;
  onEdit: () => void;
  restLabel: string | null;
  set: WorkoutSet;
}

const CompletedSetSummary = ({ activeRemainingSec, exercise, onEdit, restLabel, set }: CompletedSetSummaryProps) => {
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
            {exercise.metricType === 'duration'
              ? formatDuration(set.actualDurationSec)
              : `${set.actualWeight} x ${set.actualReps}`}
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

const isExerciseNoteDirty = (
  exercise: WorkoutExercise,
  exerciseNotes: Record<string, string>,
): boolean => (exerciseNotes[exercise.id] ?? '').trim() !== (exercise.noteSnapshot ?? '').trim();

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

const emptySetEdit = () => ({
  weight: '0',
  reps: '0',
  durationMinutes: '0',
  durationSeconds: '0',
  durationInput: '',
});

const parseDurationParts = (value: string): { durationMinutes: string; durationSeconds: string } => {
  const sanitized = value.replace(/[^\d:]/g, '');
  const [minutes = '0', seconds = '0'] = sanitized.split(':', 2);
  return {
    durationMinutes: minutes,
    durationSeconds: seconds.slice(0, 2),
  };
};

const formatDurationParts = (minutes: string, seconds: string): string =>
  `${minutes || '0'}:${(seconds || '0').padStart(2, '0')}`;

const sanitizeDurationInput = (value: string): string =>
  value.replace(/[^\d:]/g, '').replace(/(:.*):/g, '$1');

const parseDurationInput = (value: string): number | null => {
  const sanitized = sanitizeDurationInput(value).trim();
  if (!sanitized) {
    return null;
  }
  const parts = sanitized.split(':');
  if (parts.length > 2) {
    return null;
  }
  const minutes = parts.length === 2 ? Number(parts[0] || 0) : 0;
  const seconds = Number(parts.length === 2 ? parts[1] || 0 : parts[0]);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    return null;
  }
  return minutes * 60 + seconds;
};

const formatDurationInput = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const findActiveRestSet = (details: WorkoutDetails): WorkoutSet | null => {
  for (const exercise of details.exercises) {
    const set = exercise.sets.find(candidate => candidate.restStartedAt && !candidate.restFinishedAt);
    if (set) {
      return set;
    }
  }
  return null;
};

const findActiveExerciseSet = (details: WorkoutDetails): WorkoutSet | null => {
  for (const exercise of details.exercises) {
    const set = exercise.sets.find(candidate => candidate.exerciseStartedAt && !candidate.completed);
    if (set) {
      return set;
    }
  }
  return null;
};

const getExerciseElapsedSec = (startedAt: string | null): number => {
  if (!startedAt) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
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
