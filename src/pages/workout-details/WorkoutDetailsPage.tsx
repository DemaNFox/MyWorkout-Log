import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigation/types';
import { useDatabase } from '@app/providers/DatabaseProvider';
import type { WorkoutDetails } from '@entities/workout/model/types';
import { WorkoutRepository } from '@entities/workout/repository/workoutRepository';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { useThemeColors } from '@shared/ui/theme';
import { formatDuration } from '@shared/lib/date';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetails'>;

export const WorkoutDetailsPage = ({ route }: Props) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [details, setDetails] = useState<WorkoutDetails | null>(null);

  const load = useCallback(async () => {
    setDetails(await new WorkoutRepository(db).getDetails(route.params.workoutId));
  }, [db, route.params.workoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!details) {
    return <Screen title="Workout"><EmptyState text="Workout not found." /></Screen>;
  }

  return (
    <Screen title={details.session.trainingDayNameSnapshot ?? 'Workout'}>
      {details.exercises.map(exercise => (
        <Card key={exercise.id}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{exercise.nameSnapshot}</Text>
          {exercise.noteSnapshot ? (
            <Text style={{ color: colors.muted }}>{exercise.noteSnapshot}</Text>
          ) : null}
          {exercise.sets.map(set => (
            <Text key={set.id} style={{ color: colors.text }}>
              Set {set.setIndex}:{' '}
              {exercise.metricType === 'duration'
                ? formatDuration(set.actualDurationSec)
                : `${set.actualWeight} x ${set.actualReps}`}{' '}
              {set.completed ? 'done' : 'open'}
            </Text>
          ))}
        </Card>
      ))}
    </Screen>
  );
};
