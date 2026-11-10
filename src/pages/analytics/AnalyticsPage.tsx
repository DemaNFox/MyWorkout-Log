import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useDatabase } from '@app/providers/DatabaseProvider';
import { getTrendColor } from '@entities/analytics/lib/getTrendColor';
import type { AnalyticsExercise, ExerciseHistoryRow } from '@entities/analytics/model/types';
import { AnalyticsRepository } from '@entities/analytics/repository/analyticsRepository';
import { ExerciseProgressChart } from '@entities/analytics/ui/ExerciseProgressChart';
import { Card } from '@shared/ui/Card';
import { EmptyState } from '@shared/ui/EmptyState';
import { Screen } from '@shared/ui/Screen';
import { TextField } from '@shared/ui/TextField';
import { useThemeColors } from '@shared/ui/theme';

export const AnalyticsPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [exercises, setExercises] = useState<AnalyticsExercise[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryRow[]>([]);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const selected =
    exercises.find(exercise => getExerciseKey(exercise) === selectedKey) ?? null;

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

  const bestSingle = useMemo(
    () =>
      history.reduce<ExerciseHistoryRow | null>((currentBest, row) => {
        if (!currentBest) {
          return row;
        }
        if (row.bestSingleWeight > currentBest.bestSingleWeight) {
          return row;
        }
        if (row.bestSingleWeight === currentBest.bestSingleWeight && row.repsAtBestSingleWeight > currentBest.repsAtBestSingleWeight) {
          return row;
        }
        return currentBest;
      }, null),
    [history],
  );

  const load = useCallback(async () => {
    const repository = new AnalyticsRepository(db);
    const nextExercises = await repository.listExercises();
    const nextSelected =
      nextExercises.find(exercise => getExerciseKey(exercise) === selectedKey) ??
      nextExercises.find(exercise => exercise.metricType !== 'duration') ??
      nextExercises[0] ??
      null;
    setExercises(nextExercises);
    setSelectedKey(getExerciseKey(nextSelected));
    setHistory(nextSelected ? await repository.getExerciseHistory(nextSelected) : []);
  }, [db, selectedKey]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const chooseExercise = async (exercise: AnalyticsExercise) => {
    setSelectedKey(getExerciseKey(exercise));
    setHistory(await new AnalyticsRepository(db).getExerciseHistory(exercise));
    setPickerOpen(false);
    setQuery('');
  };

  return (
    <Screen title="Прогресс" eyebrow="Динамика" subtitle="Результаты по упражнениям.">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{selected?.name ?? 'Выбери упражнение'}</Text>
        <Pressable accessibilityRole="button" onPress={() => setPickerOpen(current => !current)}><Text style={{ color: colors.primary, fontWeight: '800' }}>Сменить упражнение ▾</Text></Pressable>
        {exercises.length === 0 ? (
          <EmptyState text="Заверши хотя бы один подход, чтобы увидеть прогресс." />
        ) : null}
        {pickerOpen ? <TextField label="Поиск" onChangeText={setQuery} placeholder="Название упражнения" value={query} /> : null}
        {pickerOpen ? <View style={{ gap: 8 }}>
          {exercises.filter(exercise => exercise.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(exercise => {
            const key = getExerciseKey(exercise);
            const isSelected = selectedKey === key;

            return (
            <Pressable
              key={key}
              onPress={() => void chooseExercise(exercise)}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                borderRadius: 12,
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
                {exercise.name}
              </Text>
            </Pressable>
            );
          })}
        </View> : null}
      </Card>

      {selected?.metricType === 'duration' ? <Card><Text style={{ color: colors.text, fontWeight: '800' }}>Упражнение на время</Text><Text style={{ color: colors.muted }}>График длительности пока недоступен. Выполненные подходы сохранены в истории тренировок.</Text></Card> : null}

      {selected?.metricType !== 'duration' && selected && best ? (
        <Card>
          <Text style={{ color: colors.muted, fontWeight: '700' }}>ЛУЧШИЙ РАБОЧИЙ ПОДХОД</Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
            {best.bestWeight} кг × {best.repsAtBestWeight}
          </Text>
          {bestSingle ? (
            <Text style={{ color: colors.muted }}>
              Лучший отдельный подход: {bestSingle.bestSingleWeight} кг × {bestSingle.repsAtBestSingleWeight}
            </Text>
          ) : null}
          <Text style={{ color: colors.muted }}>
            Записано тренировок: {history.length}
          </Text>
        </Card>
      ) : null}

      {selected?.metricType !== 'duration' && history.length > 0 ? <ExerciseProgressChart rows={history} /> : null}

      {selected?.metricType !== 'duration' && history.length > 0 ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Последние результаты</Text>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingBottom: 8,
              gap: 8,
            }}>
            <Text style={{ color: colors.muted, flex: 1, fontWeight: '800' }}>Дата</Text>
            <Text style={{ color: colors.muted, width: 82, fontWeight: '800' }}>Вес × повт.</Text>
            <Text style={{ color: colors.muted, width: 48, fontWeight: '800' }}>Подх.</Text>
            <Text style={{ color: colors.muted, width: 56, fontWeight: '800' }}>Тренд</Text>
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
              <Text style={{ color: colors.text, width: 82 }}>
                {row.bestWeight} x {row.repsAtBestWeight}
              </Text>
              <Text style={{ color: colors.text, width: 48 }}>{row.completedSets}</Text>
              <Text style={{ color: getTrendColor(row.trend), fontWeight: '800', width: 56 }}>{row.trend === 'up' ? '↑ Рост' : row.trend === 'down' ? '↓ Спад' : '—'}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
};

const getExerciseKey = (exercise: AnalyticsExercise | null): string | null =>
  exercise ? exercise.exerciseId ?? `name:${exercise.name}` : null;
