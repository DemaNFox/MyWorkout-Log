import { AppError } from '@shared/lib/errors';

import type { ImportEnvelope, WorkoutPlanPayload, WorkoutProgramsPayload } from '../model/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isExerciseMetricType = (value: unknown): value is 'reps' | 'duration' =>
  value === 'reps' || value === 'duration';

const isMeasurementType = (value: unknown): boolean =>
  value === 'weight_reps' ||
  value === 'bodyweight_reps' ||
  value === 'duration' ||
  value === 'assisted_reps';

const isWeightMode = (value: unknown): boolean => value === 'per_dumbbell' || value === 'total';

const muscleGroups = new Set([
  'chest', 'back', 'lats', 'traps', 'shoulders', 'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'abs',
  'lower_back',
]);
const movementTypes = new Set([
  'horizontal_press', 'incline_press', 'vertical_press', 'row', 'vertical_pull', 'squat',
  'hinge', 'lunge', 'isolation', 'core', 'calves', 'forearms', 'carry',
]);
const equipmentTypes = new Set([
  'bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'machine', 'cable', 'band', 'other',
]);

const isStringArray = (value: unknown, allowed?: Set<string>): value is string[] =>
  Array.isArray(value) &&
  value.every(item => typeof item === 'string' && (!allowed || allowed.has(item)));

const validateExerciseDictionary = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every(exercise =>
    isRecord(exercise) &&
    isNonEmptyString(exercise.id) &&
    isNonEmptyString(exercise.name) &&
    isStringArray(exercise.primaryMuscles, muscleGroups) &&
    exercise.primaryMuscles.length > 0 &&
    (!('secondaryMuscles' in exercise) || isStringArray(exercise.secondaryMuscles, muscleGroups)) &&
    movementTypes.has(String(exercise.movementType)) &&
    equipmentTypes.has(String(exercise.equipmentType)) &&
    isMeasurementType(exercise.defaultMeasurementType) &&
    (!('defaultWeightMode' in exercise) || isWeightMode(exercise.defaultWeightMode)) &&
    (!('aliases' in exercise) || isStringArray(exercise.aliases)) &&
    (!('isCustom' in exercise) || typeof exercise.isCustom === 'boolean'),
  );

const validatePlanPayload = (payload: unknown): payload is WorkoutPlanPayload => {
  if (!isRecord(payload) || !isNonEmptyString(payload.name) || !Array.isArray(payload.days)) {
    return false;
  }
  return payload.days.every(day => {
    if (!isRecord(day) || !isNonEmptyString(day.name) || !isNonNegativeNumber(day.order) || !Array.isArray(day.exercises)) {
      return false;
    }
    return day.exercises.every(exercise => {
      if (!isRecord(exercise)) {
        return false;
      }
      const metricType = 'metricType' in exercise ? exercise.metricType : 'reps';
      const validDuration =
        metricType !== 'duration' ||
        (isNonNegativeNumber(exercise.targetDurationSec) && exercise.targetDurationSec > 0);
      const validReference =
        !('exerciseId' in exercise) ||
        exercise.exerciseId === null ||
        isNonEmptyString(exercise.exerciseId);
      const validMeasurement =
        !('measurementType' in exercise) || isMeasurementType(exercise.measurementType);
      const validWeightMode =
        !('weightMode' in exercise) ||
        exercise.weightMode === null ||
        (isWeightMode(exercise.weightMode) && exercise.measurementType !== 'duration');
      return (
        isNonEmptyString(exercise.name) &&
        validReference &&
        validMeasurement &&
        validWeightMode &&
        isExerciseMetricType(metricType) &&
        isNonNegativeNumber(exercise.targetSets) &&
        exercise.targetSets > 0 &&
        isNonNegativeNumber(exercise.targetReps) &&
        isNonNegativeNumber(exercise.targetWeight) &&
        validDuration &&
        (!('note' in exercise) || isNullableString(exercise.note)) &&
        isNonNegativeNumber(exercise.order)
      );
    });
  });
};

const validateProgramsPayload = (payload: unknown): payload is WorkoutProgramsPayload =>
  isRecord(payload) &&
  Array.isArray(payload.programs) &&
  payload.programs.length > 0 &&
  payload.programs.every(validatePlanPayload) &&
  (!('exerciseDictionary' in payload) || validateExerciseDictionary(payload.exerciseDictionary));

export const parseImportEnvelope = (raw: string): ImportEnvelope => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError('File is not valid JSON', 'import.invalidJson');
  }

  if (!isRecord(parsed)) {
    throw new AppError('Import file must be a JSON object', 'import.invalidShape');
  }
  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
    throw new AppError('Import schema version is not supported', 'import.unsupportedVersion');
  }
  if (parsed.type === 'workout-plan' && validatePlanPayload(parsed.payload)) {
    return parsed as unknown as ImportEnvelope;
  }
  if (parsed.type === 'workout-programs' && validateProgramsPayload(parsed.payload)) {
    return parsed as unknown as ImportEnvelope;
  }
  if (parsed.type === 'full-backup' && isRecord(parsed.payload)) {
    return parsed as unknown as ImportEnvelope;
  }
  throw new AppError('Import payload does not match Workout Logger format', 'import.invalidPayload');
};
