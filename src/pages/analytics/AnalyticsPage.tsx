import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useDatabase } from '@app/providers/DatabaseProvider';
import { getTrendColor } from '@entities/analytics/lib/getTrendColor';
import type { ExerciseHistoryRow } from '@entities/analytics/model/types';
import { AnalyticsRepository } from '@entities/analytics/repository/analyticsRepository';
import { ExerciseProgressChart } from '@widgets/exercise-progress-chart/ExerciseProgressChart';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { useThemeColors } from '@shared/ui/theme';

export const AnalyticsPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryRow[]>([]);

  const best = useMemo(
    () =>
      history.reduce<ExerciseHistoryRow | null>((currentBest, row) => {
        if (!currentBest) {
          return row;
        }
        if (row.bestWeight > currentBest.bestWeight) {
          return row;
        }
        if (row.bestWeight === currentBest.bestWeight && row.repsAtBestWeight > currentBest.repsAtBestWeight) {
          return row;
        }
        return currentBest;
      }, null),
    [history],
  );

  const load = useCallback(async () => {
    const repository = new AnalyticsRepository(db);
    const nextNames = await repository.listExerciseNames();
    const nextSelected = selected && nextNames.includes(selected) ? selected : nextNames[0] ?? null;
    setNames(nextNames);
    setSelected(nextSelected);
    setHistory(nextSelected ? await repository.getExerciseHistory(nextSelected) : []);
  }, [db, selected]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const chooseExercise = async (name: string) => {
    setSelected(name);
    setHistory(await new AnalyticsRepository(db).getExerciseHistory(name));
  };

  return (
    <Screen title="Analytics">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Completed exercises</Text>
        {names.length === 0 ? (
          <EmptyState text="Complete at least one set in a workout to see exercise analytics." />
        ) : null}
        <View style={{ gap: 8 }}>
          {names.map(name => {
            const isSelected = selected === name;

            return (
            <Pressable
              key={name}
              onPress={() => void chooseExercise(name)}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                borderRadius: 8,
                borderWidth: isSelected ? 0 : 1,
                borderColor: colors.secondaryBorder,
                backgroundColor: isSelected ? colors.primary : colors.secondarySurface,
                opacity: pressed ? 0.82 : 1,
                paddingHorizontal: 12,
                paddingVertical: 10,
              })}>
              <Text
                style={{
                  color: isSelected ? colors.primaryText : colors.secondaryText,
                  fontSize: 16,
                  fontWeight: '800',
                }}>
                {name}
              </Text>
            </Pressable>
            );
          })}
        </View>
      </Card>

      {selected && best ? (
        <Card>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>Best result</Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            {best.bestWeight} x {best.repsAtBestWeight}
          </Text>
          <Text style={{ color: colors.muted }}>
            {history.length} workout{history.length === 1 ? '' : 's'} logged for {selected}
          </Text>
        </Card>
      ) : null}

      {history.length > 0 ? <ExerciseProgressChart rows={history} /> : null}

      {history.length > 0 ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>History table</Text>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingBottom: 8,
              gap: 8,
            }}>
            <Text style={{ color: colors.muted, flex: 1, fontWeight: '800' }}>Date</Text>
            <Text style={{ color: colors.muted, width: 72, fontWeight: '800' }}>Best</Text>
            <Text style={{ color: colors.muted, width: 48, fontWeight: '800' }}>Sets</Text>
            <Text style={{ color: colors.muted, width: 56, fontWeight: '800' }}>Trend</Text>
          </View>
          {history.map(row => (
            <View
              key={`${row.workoutSessionId}-${row.workoutExerciseId}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingVertical: 8,
                gap: 8,
              }}>
              <Text style={{ color: colors.text, flex: 1 }}>{row.date.slice(0, 10)}</Text>
              <Text style={{ color: colors.text, width: 72 }}>
                {row.bestWeight} x {row.repsAtBestWeight}
              </Text>
              <Text style={{ color: colors.text, width: 48 }}>{row.completedSets}</Text>
              <Text style={{ color: getTrendColor(row.trend), fontWeight: '800', width: 56 }}>{row.trend}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
};
