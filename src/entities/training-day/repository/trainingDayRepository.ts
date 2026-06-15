import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { assertNonEmpty, assertNonNegative, assertPositive } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';

import type { PlannedExercise, TrainingDay } from '../model/types';

type TrainingDayRow = {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type PlannedExerciseRow = {
  id: string;
  training_day_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const toDay = (row: TrainingDayRow): TrainingDay => ({
  id: row.id,
  planId: row.plan_id,
  name: row.name,
  order: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toExercise = (row: PlannedExerciseRow): PlannedExercise => ({
  id: row.id,
  trainingDayId: row.training_day_id,
  name: row.name,
  targetSets: row.target_sets,
  targetReps: row.target_reps,
  targetWeight: row.target_weight,
  note: row.note,
  order: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class TrainingDayRepository {
  constructor(private readonly db: Database) {}

  async createDay(planId: string, name: string): Promise<TrainingDay> {
    assertNonEmpty(name, 'Training day name is required');
    const existing = await this.listDays(planId);
    const timestamp = nowIso();
    const day: TrainingDay = {
      id: createId(),
      planId,
      name: name.trim(),
      order: existing.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO training_days (id, plan_id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [day.id, day.planId, day.name, day.order, day.createdAt, day.updatedAt],
    );
    return day;
  }

  async listDays(planId: string): Promise<TrainingDay[]> {
    const rows = await this.db.getAll<TrainingDayRow>(
      'SELECT * FROM training_days WHERE plan_id = ? ORDER BY sort_order ASC',
      [planId],
    );
    return rows.map(toDay);
  }

  async addExercise(input: {
    trainingDayId: string;
    name: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    note?: string | null;
  }): Promise<PlannedExercise> {
    assertNonEmpty(input.name, 'Exercise name is required');
    assertPositive(input.targetSets, 'Target sets must be greater than zero');
    assertNonNegative(input.targetReps, 'Target reps cannot be negative');
    assertNonNegative(input.targetWeight, 'Target weight cannot be negative');
    const existing = await this.listExercises(input.trainingDayId);
    const timestamp = nowIso();
    const exercise: PlannedExercise = {
      id: createId(),
      trainingDayId: input.trainingDayId,
      name: input.name.trim(),
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      targetWeight: input.targetWeight,
      note: input.note ?? null,
      order: existing.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO planned_exercises
       (id, training_day_id, name, target_sets, target_reps, target_weight, note, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        exercise.trainingDayId,
        exercise.name,
        exercise.targetSets,
        exercise.targetReps,
        exercise.targetWeight,
        exercise.note,
        exercise.order,
        exercise.createdAt,
        exercise.updatedAt,
      ],
    );
    return exercise;
  }

  async listExercises(trainingDayId: string): Promise<PlannedExercise[]> {
    const rows = await this.db.getAll<PlannedExerciseRow>(
      'SELECT * FROM planned_exercises WHERE training_day_id = ? ORDER BY sort_order ASC',
      [trainingDayId],
    );
    return rows.map(toExercise);
  }

  async deleteExercise(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.execute('DELETE FROM workout_exercises WHERE source_planned_exercise_id = ?', [id]);
      await this.db.execute('DELETE FROM planned_exercises WHERE id = ?', [id]);
    });
  }
}
