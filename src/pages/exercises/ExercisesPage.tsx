import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useDatabase } from '@app/providers/DatabaseProvider';
import type { EquipmentType, Exercise, MovementType, MuscleGroup } from '@entities/exercise/model/types';
import {
  ExerciseCatalogRepository,
  type CustomExerciseInput,
} from '@entities/exercise/repository/exerciseCatalogRepository';
import type { MeasurementType, WeightMode } from '@shared/types/domain';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Screen } from '@shared/ui/Screen';
import { TextField } from '@shared/ui/TextField';
import { useThemeColors } from '@shared/ui/theme';

const equipmentOptions: EquipmentType[] = [
  'bodyweight',
  'dumbbell',
  'barbell',
  'kettlebell',
  'machine',
  'cable',
  'band',
  'other',
];
const measurementOptions: MeasurementType[] = [
  'weight_reps',
  'bodyweight_reps',
  'duration',
  'assisted_reps',
];
const muscleOptions: MuscleGroup[] = [
  'chest',
  'back',
  'lats',
  'traps',
  'shoulders',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'abs',
  'lower_back',
];
const movementOptions: MovementType[] = [
  'horizontal_press',
  'incline_press',
  'vertical_press',
  'row',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
  'isolation',
  'core',
  'calves',
  'forearms',
  'carry',
];

const emptyForm = (): CustomExerciseInput => ({
  name: '',
  equipmentType: 'dumbbell',
  primaryMuscle: 'chest',
  movementType: 'isolation',
  defaultMeasurementType: 'weight_reps',
  defaultWeightMode: 'per_dumbbell',
});

export const ExercisesPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<CustomExerciseInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setExercises(await new ExerciseCatalogRepository(db).list());
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    try {
      const repository = new ExerciseCatalogRepository(db);
      if (editingId) {
        await repository.update(editingId, form);
      } else {
        await repository.create(form);
      }
      setEditingId(null);
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } catch (error) {
      Alert.alert('Cannot save exercise', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const edit = (exercise: Exercise) => {
    setShowForm(true);
    setEditingId(exercise.id);
    setForm({
      name: exercise.name,
      equipmentType: exercise.equipmentType,
      primaryMuscle: exercise.primaryMuscles[0] ?? 'core',
      movementType: exercise.movementType,
      defaultMeasurementType: exercise.defaultMeasurementType,
      defaultWeightMode: exercise.defaultWeightMode ?? null,
    });
  };

  const confirmDelete = (exercise: Exercise) => {
    Alert.alert('Delete exercise', `Delete “${exercise.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void new ExerciseCatalogRepository(db)
            .delete(exercise.id)
            .then(load)
            .catch((error: unknown) =>
              Alert.alert('Cannot delete exercise', error instanceof Error ? error.message : 'Unknown error'),
            );
        },
      },
    ]);
  };

  const visibleExercises = exercises.filter(exercise =>
    exercise.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <Screen title="Упражнения" eyebrow="Каталог" subtitle="Выбирай готовые или добавляй свои.">
      <Button onPress={() => { setEditingId(null); setForm(emptyForm()); setShowForm(current => !current); }} variant="secondary">{showForm ? 'Закрыть форму' : '+ Своё упражнение'}</Button>
      {showForm ? <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
          {editingId ? 'Изменить упражнение' : 'Новое упражнение'}
        </Text>
        <TextField label="Название" onChangeText={name => setForm(current => ({ ...current, name }))} value={form.name} />
        <OptionPicker
          label="Equipment"
          onChange={equipmentType =>
            setForm(current => ({
              ...current,
              equipmentType,
              defaultMeasurementType:
                equipmentType === 'bodyweight' ? 'bodyweight_reps' : current.defaultMeasurementType,
              defaultWeightMode:
                equipmentType === 'bodyweight' ? null : current.defaultWeightMode ?? 'total',
            }))
          }
          options={equipmentOptions}
          value={form.equipmentType}
        />
        <OptionPicker
          label="Measurement"
          onChange={defaultMeasurementType =>
            setForm(current => ({
              ...current,
              defaultMeasurementType,
              defaultWeightMode:
                defaultMeasurementType === 'weight_reps'
                  ? current.defaultWeightMode ?? 'total'
                  : null,
            }))
          }
          options={measurementOptions}
          value={form.defaultMeasurementType}
        />
        {form.defaultMeasurementType === 'weight_reps' ? (
          <OptionPicker
            label="Weight entry"
            onChange={defaultWeightMode => setForm(current => ({ ...current, defaultWeightMode }))}
            options={['per_dumbbell', 'total'] satisfies WeightMode[]}
            value={form.defaultWeightMode ?? 'total'}
          />
        ) : null}
        <OptionPicker
          label="Primary muscle"
          onChange={primaryMuscle => setForm(current => ({ ...current, primaryMuscle }))}
          options={muscleOptions}
          value={form.primaryMuscle}
        />
        <OptionPicker
          label="Movement"
          onChange={movementType => setForm(current => ({ ...current, movementType }))}
          options={movementOptions}
          value={form.movementType}
        />
        <Button disabled={!form.name.trim()} onPress={() => void save()}>
          {editingId ? 'Сохранить изменения' : 'Создать упражнение'}
        </Button>
        {editingId ? (
          <Button
            onPress={() => {
              setEditingId(null);
              setForm(emptyForm());
            }}
            variant="secondary">
            Отмена
          </Button>
        ) : null}
      </Card> : null}

      <TextField label="Поиск упражнений" onChangeText={setQuery} value={query} />
      {visibleExercises.map(exercise => (
        <Card key={exercise.id}>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{exercise.name}</Text>
              <Text style={{ color: colors.muted }}>
                {exercise.equipmentType} · {exercise.defaultMeasurementType}
                {exercise.defaultWeightMode ? ` · ${exercise.defaultWeightMode}` : ''}
              </Text>
              <Text style={{ color: colors.muted }}>
                {exercise.primaryMuscles.join(', ')} · {exercise.movementType}
              </Text>
            </View>
            <Text style={{ color: exercise.isCustom ? colors.primary : colors.muted, fontWeight: '700' }}>
              {exercise.isCustom ? 'Своё' : 'Каталог'}
            </Text>
          </View>
          {exercise.isCustom ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Button onPress={() => edit(exercise)} variant="secondary">Изменить</Button></View>
              <View style={{ flex: 1 }}><Button onPress={() => confirmDelete(exercise)} variant="danger">Удалить</Button></View>
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
};

const OptionPicker = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) => {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded(current => !current)}
        style={{
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          minHeight: 44,
          justifyContent: 'center',
          paddingHorizontal: 12,
        }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{formatOption(value)} ▾</Text>
      </Pressable>
      {expanded ? (
        <View style={{ borderColor: colors.border, borderRadius: 8, borderWidth: 1, overflow: 'hidden' }}>
          {options.map(option => (
            <Pressable
              key={option}
              onPress={() => {
                onChange(option);
                setExpanded(false);
              }}
              style={{
                backgroundColor: option === value ? colors.secondarySurface : colors.surface,
                minHeight: 40,
                justifyContent: 'center',
                paddingHorizontal: 12,
              }}>
              <Text style={{ color: colors.text }}>{formatOption(option)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const formatOption = (value: string): string =>
  value.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());
