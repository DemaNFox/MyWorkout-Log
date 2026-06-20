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
      return (
        isNonEmptyString(exercise.name) &&
        isNonNegativeNumber(exercise.targetSets) &&
        exercise.targetSets > 0 &&
        isNonNegativeNumber(exercise.targetReps) &&
        isNonNegativeNumber(exercise.targetWeight) &&
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
  payload.programs.every(validatePlanPayload);

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
  if (parsed.schemaVersion !== 1) {
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
