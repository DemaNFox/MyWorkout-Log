import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { AppError, assertNonEmpty } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';

import { getAllExercises } from '../model/exerciseCatalog';
import type { EquipmentType, Exercise, MovementType, MuscleGroup } from '../model/types';
import type { MeasurementType, WeightMode } from '@shared/types/domain';

type CustomExerciseRow = {
  id: string;
  name: string;
  equipment_type: EquipmentType;
  primary_muscle: MuscleGroup;
  movement_type: MovementType;
  default_measurement_type: MeasurementType;
  default_weight_mode: WeightMode | null;
};

export interface CustomExerciseInput {
  name: string;
  equipmentType: EquipmentType;
  primaryMuscle: MuscleGroup;
  movementType: MovementType;
  defaultMeasurementType: MeasurementType;
  defaultWeightMode: WeightMode | null;
}

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const toExercise = (row: CustomExerciseRow): Exercise => ({
  id: row.id,
  name: row.name,
  equipmentType: row.equipment_type,
  primaryMuscles: [row.primary_muscle],
  movementType: row.movement_type,
  defaultMeasurementType: row.default_measurement_type,
  ...(row.default_weight_mode ? { defaultWeightMode: row.default_weight_mode } : {}),
  isCustom: true,
});

export class ExerciseCatalogRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<Exercise[]> {
    const customRows = await this.db.getAll<CustomExerciseRow>(
      'SELECT * FROM custom_exercises ORDER BY name ASC',
    );
    return [...getAllExercises(), ...customRows.map(toExercise)].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  async getById(id: string): Promise<Exercise | null> {
    const exercise = (await this.list()).find(candidate => candidate.id === id);
    return exercise ?? null;
  }

  async findByName(name: string): Promise<Exercise | null> {
    const query = normalize(name);
    const exercise = (await this.list()).find(
      candidate =>
        normalize(candidate.name) === query ||
        candidate.aliases?.some(alias => normalize(alias) === query),
    );
    return exercise ?? null;
  }

  async create(input: CustomExerciseInput): Promise<Exercise> {
    this.validate(input);
    if (await this.findByName(input.name)) {
      throw new AppError('Exercise name already exists', 'exercise.duplicateName');
    }
    const timestamp = nowIso();
    const id = `custom-${createId()}`;
    await this.db.execute(
      `INSERT INTO custom_exercises
       (id, name, equipment_type, primary_muscle, movement_type, default_measurement_type,
        default_weight_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        input.equipmentType,
        input.primaryMuscle,
        input.movementType,
        input.defaultMeasurementType,
        this.getWeightMode(input),
        timestamp,
        timestamp,
      ],
    );
    const created = await this.getById(id);
    if (!created) {
      throw new AppError('Exercise was not created', 'exercise.createFailed');
    }
    return created;
  }

  async importCustom(exercise: Exercise): Promise<void> {
    if (!exercise.isCustom) {
      return;
    }
    const existingById = await this.getById(exercise.id);
    if (existingById) {
      return;
    }
    if (await this.findByName(exercise.name)) {
      throw new AppError(
        `Exercise name already exists: ${exercise.name}`,
        'exercise.duplicateName',
      );
    }
    const primaryMuscle = exercise.primaryMuscles[0];
    if (!primaryMuscle) {
      throw new AppError('Custom exercise requires a primary muscle', 'exercise.primaryMuscleRequired');
    }
    const input: CustomExerciseInput = {
      name: exercise.name,
      equipmentType: exercise.equipmentType,
      primaryMuscle,
      movementType: exercise.movementType,
      defaultMeasurementType: exercise.defaultMeasurementType,
      defaultWeightMode: exercise.defaultWeightMode ?? null,
    };
    this.validate(input);
    const timestamp = nowIso();
    await this.db.execute(
      `INSERT INTO custom_exercises
       (id, name, equipment_type, primary_muscle, movement_type, default_measurement_type,
        default_weight_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        input.name.trim(),
        input.equipmentType,
        input.primaryMuscle,
        input.movementType,
        input.defaultMeasurementType,
        this.getWeightMode(input),
        timestamp,
        timestamp,
      ],
    );
  }

  async update(id: string, input: CustomExerciseInput): Promise<void> {
    this.validate(input);
    const current = await this.db.getFirst<CustomExerciseRow>(
      'SELECT * FROM custom_exercises WHERE id = ?',
      [id],
    );
    if (!current) {
      throw new AppError('Only custom exercises can be edited', 'exercise.notCustom');
    }
    const duplicate = await this.findByName(input.name);
    if (duplicate && duplicate.id !== id) {
      throw new AppError('Exercise name already exists', 'exercise.duplicateName');
    }
    const timestamp = nowIso();
    await this.db.transaction(async () => {
      await this.db.execute(
        `UPDATE custom_exercises
         SET name = ?, equipment_type = ?, primary_muscle = ?, movement_type = ?,
             default_measurement_type = ?, default_weight_mode = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.name.trim(),
          input.equipmentType,
          input.primaryMuscle,
          input.movementType,
          input.defaultMeasurementType,
          this.getWeightMode(input),
          timestamp,
          id,
        ],
      );
      await this.db.execute(
        'UPDATE planned_exercises SET name = ?, updated_at = ? WHERE exercise_id = ?',
        [input.name.trim(), timestamp, id],
      );
      await this.db.execute(
        `UPDATE workout_exercises
         SET name_snapshot = ?, updated_at = ?
         WHERE exercise_id = ?
           AND workout_session_id IN (
             SELECT id FROM workout_sessions WHERE status = 'planned' AND finished_at IS NULL
           )`,
        [input.name.trim(), timestamp, id],
      );
    });
  }

  async delete(id: string): Promise<void> {
    const customExercise = await this.db.getFirst<CustomExerciseRow>(
      'SELECT * FROM custom_exercises WHERE id = ?',
      [id],
    );
    if (!customExercise) {
      throw new AppError(
        'Built-in exercises cannot be deleted',
        'exercise.builtInProtected',
      );
    }
    const referenced = await this.db.getFirst<{ id: string }>(
      'SELECT id FROM planned_exercises WHERE exercise_id = ? LIMIT 1',
      [id],
    );
    if (referenced) {
      throw new AppError(
        'Remove this exercise from workout plans before deleting it',
        'exercise.inUse',
      );
    }
    await this.db.execute('DELETE FROM custom_exercises WHERE id = ?', [id]);
  }

  private validate(input: CustomExerciseInput): void {
    assertNonEmpty(input.name, 'Exercise name is required');
    if (input.defaultMeasurementType === 'weight_reps' && !input.defaultWeightMode) {
      throw new AppError('Select how weight is recorded', 'exercise.weightModeRequired');
    }
  }

  private getWeightMode(input: CustomExerciseInput): WeightMode | null {
    return input.defaultMeasurementType === 'weight_reps' ? input.defaultWeightMode : null;
  }
}
