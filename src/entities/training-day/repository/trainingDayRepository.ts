import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { assertNonEmpty, assertNonNegative, assertPositive } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';
import { normalizeName } from '@shared/lib/normalizeName';

import type { PlannedExercise, TrainingDay } from '../model/types';
import type { ExerciseMetricType } from '@shared/types/domain';

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
  metric_type?: ExerciseMetricType;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  target_duration_sec?: number | null;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type WorkoutSessionRow = {
  id: string;
  status: string;
  finished_at: string | null;
};

type WorkoutExerciseRow = {
  id: string;
  source_planned_exercise_id: string | null;
};

type WorkoutSetRow = {
  id: string;
  set_index: number;
  completed: number;
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
  metricType: row.metric_type ?? 'reps',
  targetSets: row.target_sets,
  targetReps: row.target_reps,
  targetWeight: row.target_weight,
  targetDurationSec: row.target_duration_sec ?? null,
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
    metricType?: ExerciseMetricType;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    targetDurationSec?: number | null;
    note?: string | null;
  }): Promise<PlannedExercise> {
    assertNonEmpty(input.name, 'Exercise name is required');
    assertPositive(input.targetSets, 'Target sets must be greater than zero');
    assertNonNegative(input.targetReps, 'Target reps cannot be negative');
    assertNonNegative(input.targetWeight, 'Target weight cannot be negative');
    if (input.metricType === 'duration') {
      assertPositive(input.targetDurationSec ?? 0, 'Target duration must be greater than zero');
    }
    const existing = await this.listExercises(input.trainingDayId);
    const relatedExercises = await this.listRelatedExercises(input.trainingDayId, input.name);
    const requestedNote = input.note?.trim() || null;
    const inheritedNote = relatedExercises.find(exercise => exercise.note)?.note ?? null;
    const note = requestedNote ?? inheritedNote;
    const timestamp = nowIso();
    const exercise: PlannedExercise = {
      id: createId(),
      trainingDayId: input.trainingDayId,
      name: input.name.trim(),
      metricType: input.metricType ?? 'reps',
      targetSets: input.targetSets,
      targetReps: input.targetReps,
      targetWeight: input.targetWeight,
      targetDurationSec: input.metricType === 'duration' ? input.targetDurationSec ?? null : null,
      note,
      order: existing.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.transaction(async () => {
      await this.db.execute(
        `INSERT INTO planned_exercises
         (id, training_day_id, name, metric_type, target_sets, target_reps, target_weight, target_duration_sec, note, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.trainingDayId,
          exercise.name,
          exercise.metricType,
          exercise.targetSets,
          exercise.targetReps,
          exercise.targetWeight,
          exercise.targetDurationSec,
          exercise.note,
          exercise.order,
          exercise.createdAt,
          exercise.updatedAt,
        ],
      );
      if (requestedNote) {
        await this.updateNotes(relatedExercises, requestedNote, timestamp);
      }
    });
    return exercise;
  }

  async listExercises(trainingDayId: string): Promise<PlannedExercise[]> {
    const rows = await this.db.getAll<PlannedExerciseRow>(
      'SELECT * FROM planned_exercises WHERE training_day_id = ? ORDER BY sort_order ASC',
      [trainingDayId],
    );
    return rows.map(toExercise);
  }

  async updateExercise(input: {
    id: string;
    name: string;
    metricType: ExerciseMetricType;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    targetDurationSec: number | null;
    note: string | null;
  }): Promise<void> {
    assertNonEmpty(input.name, 'Exercise name is required');
    assertPositive(input.targetSets, 'Target sets must be greater than zero');
    assertNonNegative(input.targetReps, 'Target reps cannot be negative');
    assertNonNegative(input.targetWeight, 'Target weight cannot be negative');
    if (input.metricType === 'duration') {
      assertPositive(input.targetDurationSec ?? 0, 'Target duration must be greater than zero');
    }
    const current = await this.db.getFirst<PlannedExerciseRow>(
      'SELECT * FROM planned_exercises WHERE id = ?',
      [input.id],
    );
    if (!current) {
      return;
    }
    const relatedExercises = await this.listRelatedExercises(current.training_day_id, current.name);
    const timestamp = nowIso();
    const normalizedNote = input.note?.trim() || null;
    await this.db.transaction(async () => {
      await this.db.execute(
        `UPDATE planned_exercises
         SET name = ?, metric_type = ?, target_sets = ?, target_reps = ?, target_weight = ?,
             target_duration_sec = ?, note = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.name.trim(),
          input.metricType,
          input.targetSets,
          input.metricType === 'reps' ? input.targetReps : 0,
          input.metricType === 'reps' ? input.targetWeight : 0,
          input.metricType === 'duration' ? input.targetDurationSec : null,
          normalizedNote,
          timestamp,
          input.id,
        ],
      );
      await this.updateRelatedExerciseIdentity(
        relatedExercises.filter(exercise => exercise.id !== input.id),
        input.name.trim(),
        normalizedNote,
        timestamp,
      );
      await this.syncOpenWorkoutExercise(input, current.training_day_id, relatedExercises, timestamp);
    });
  }

  async deleteExercise(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.execute('DELETE FROM workout_exercises WHERE source_planned_exercise_id = ?', [id]);
      await this.db.execute('DELETE FROM planned_exercises WHERE id = ?', [id]);
    });
  }

  private async listRelatedExercises(trainingDayId: string, name: string): Promise<PlannedExercise[]> {
    const day = await this.db.getFirst<TrainingDayRow>('SELECT * FROM training_days WHERE id = ?', [
      trainingDayId,
    ]);
    if (!day) {
      return [];
    }
    const days = await this.listDays(day.plan_id);
    const exercises = (await Promise.all(days.map(candidate => this.listExercises(candidate.id)))).flat();
    const normalizedName = normalizeName(name);
    return exercises.filter(exercise => normalizeName(exercise.name) === normalizedName);
  }

  private async updateNotes(
    exercises: PlannedExercise[],
    note: string | null,
    timestamp: string,
  ): Promise<void> {
    for (const exercise of exercises) {
      await this.db.execute(
        'UPDATE planned_exercises SET note = ?, updated_at = ? WHERE id = ?',
        [note, timestamp, exercise.id],
      );
    }
  }

  private async updateRelatedExerciseIdentity(
    exercises: PlannedExercise[],
    name: string,
    note: string | null,
    timestamp: string,
  ): Promise<void> {
    for (const exercise of exercises) {
      await this.db.execute(
        'UPDATE planned_exercises SET name = ?, note = ?, updated_at = ? WHERE id = ?',
        [name, note, timestamp, exercise.id],
      );
    }
  }

  private async syncOpenWorkoutExercise(
    input: {
      id: string;
      name: string;
      metricType: ExerciseMetricType;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
      targetDurationSec: number | null;
      note: string | null;
    },
    trainingDayId: string,
    relatedExercises: PlannedExercise[],
    timestamp: string,
  ): Promise<void> {
    const day = await this.db.getFirst<TrainingDayRow>('SELECT * FROM training_days WHERE id = ?', [
      trainingDayId,
    ]);
    if (!day) {
      return;
    }
    const sessions = await this.db.getAll<WorkoutSessionRow>(
      'SELECT * FROM workout_sessions WHERE source_plan_id = ?',
      [day.plan_id],
    );
    const openSessions = sessions.filter(session => session.status === 'planned' && !session.finished_at);
    const relatedIds = new Set(relatedExercises.map(exercise => exercise.id));

    for (const session of openSessions) {
      const workoutExercises = await this.db.getAll<WorkoutExerciseRow>(
        'SELECT * FROM workout_exercises WHERE workout_session_id = ? ORDER BY sort_order ASC',
        [session.id],
      );
      for (const workoutExercise of workoutExercises) {
        if (workoutExercise.source_planned_exercise_id === input.id) {
          await this.db.execute(
            `UPDATE workout_exercises
             SET name_snapshot = ?, note_snapshot = ?, metric_type = ?, updated_at = ?
             WHERE id = ?`,
            [input.name.trim(), input.note?.trim() || null, input.metricType, timestamp, workoutExercise.id],
          );
          await this.syncPendingSets(workoutExercise.id, input, timestamp);
        } else if (
          workoutExercise.source_planned_exercise_id &&
          relatedIds.has(workoutExercise.source_planned_exercise_id)
        ) {
          await this.db.execute(
            'UPDATE workout_exercises SET name_snapshot = ?, note_snapshot = ?, updated_at = ? WHERE id = ?',
            [input.name.trim(), input.note?.trim() || null, timestamp, workoutExercise.id],
          );
        }
      }
    }
  }

  private async syncPendingSets(
    workoutExerciseId: string,
    input: {
      metricType: ExerciseMetricType;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
      targetDurationSec: number | null;
    },
    timestamp: string,
  ): Promise<void> {
    const sets = await this.db.getAll<WorkoutSetRow>(
      'SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_index ASC',
      [workoutExerciseId],
    );
    const completedCount = sets.filter(set => set.completed === 1).length;
    const desiredCount = Math.max(input.targetSets, completedCount);

    for (const set of sets) {
      if (set.completed === 0 && set.set_index > desiredCount) {
        await this.db.execute('DELETE FROM workout_sets WHERE id = ?', [set.id]);
        continue;
      }
      if (set.completed === 0) {
        await this.db.execute(
          `UPDATE workout_sets
           SET target_weight = ?, target_reps = ?, target_duration_sec = ?,
               actual_weight = ?, actual_reps = ?, actual_duration_sec = ?, updated_at = ?
           WHERE id = ?`,
          [
            input.metricType === 'reps' ? input.targetWeight : 0,
            input.metricType === 'reps' ? input.targetReps : 0,
            input.metricType === 'duration' ? input.targetDurationSec : null,
            input.metricType === 'reps' ? input.targetWeight : 0,
            input.metricType === 'reps' ? input.targetReps : 0,
            input.metricType === 'duration' ? input.targetDurationSec : null,
            timestamp,
            set.id,
          ],
        );
      }
    }

    for (let setIndex = sets.length + 1; setIndex <= desiredCount; setIndex += 1) {
      await this.db.execute(
        `INSERT INTO workout_sets
         (id, workout_exercise_id, set_index, target_weight, target_reps, target_duration_sec,
          actual_weight, actual_reps, actual_duration_sec, completed, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createId(),
          workoutExerciseId,
          setIndex,
          input.metricType === 'reps' ? input.targetWeight : 0,
          input.metricType === 'reps' ? input.targetReps : 0,
          input.metricType === 'duration' ? input.targetDurationSec : null,
          input.metricType === 'reps' ? input.targetWeight : 0,
          input.metricType === 'reps' ? input.targetReps : 0,
          input.metricType === 'duration' ? input.targetDurationSec : null,
          0,
          null,
          timestamp,
          timestamp,
        ],
      );
    }
  }
}
