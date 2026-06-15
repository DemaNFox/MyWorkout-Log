import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { WorkoutDetails } from '@entities/workout/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { RestTimer } from '@features/rest-timer/ui/RestTimer';
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
      await new WorkoutRepository(db).completeSet(setId, Number(edit.weight), Number(edit.reps));
      await load();
    } catch (error) {
      Alert.alert('Cannot complete set', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const finish = async () => {
    await new WorkoutRepository(db).finishSession(route.params.workoutId, 'completed');
    navigation.goBack();
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
              {exercise.sets.map(set => (
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
        <RestTimer />
      </View>
    </View>
  );
};
