import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { AppError, assertNonNegative } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';
import { normalizeName } from '@shared/lib/normalizeName';
import type {
  ExerciseMetricType,
  MeasurementType,
  SetEffort,
  WeightMode,
} from '@shared/types/domain';

import type { WorkoutDetails, WorkoutExercise, WorkoutSession, WorkoutSet } from '../model/types';

type SessionRow = {
  id: string;
  source_plan_id: string | null;
  source_training_day_id: string | null;
  plan_name_snapshot: string | null;
  training_day_name_snapshot: string | null;
  status: WorkoutSession['status'];
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  comment?: string | null;
  feedback_energy?: 'low' | 'normal' | 'high' | null;
  feedback_difficulty?: 'easy' | 'normal' | 'hard' | 'too_hard' | null;
  feedback_note?: string | null;
  created_at: string;
  updated_at: string;
};

type ExerciseRow = {
  id: string;
  workout_session_id: string;
  source_planned_exercise_id: string | null;
  exercise_id?: string | null;
  name_snapshot: string;
  note_snapshot: string | null;
  metric_type?: ExerciseMetricType;
  measurement_type?: MeasurementType;
  weight_mode?: WeightMode | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SetRow = {
  id: string;
  workout_exercise_id: string;
  set_index: number;
  target_weight: number | null;
  target_reps: number | null;
  target_duration_sec?: number | null;
  actual_weight: number;
  actual_reps: number;
  actual_duration_sec?: number | null;
  effort?: SetEffort | null;
  exercise_started_at?: string | null;
  completed: number;
  completed_at: string | null;
  rest_started_at: string | null;
  rest_finished_at: string | null;
  rest_duration_sec: number | null;
  rest_target_sec: number | null;
  created_at: string;
  updated_at: string;
};

type ActivePlanRow = {
  id: string;
};

type PlannedExerciseRow = {
  id: string;
  training_day_id: string;
  name: string;
};

type TrainingDayRow = {
  id: string;
  plan_id: string;
};

const toSession = (row: SessionRow): WorkoutSession => ({
  id: row.id,
  sourcePlanId: row.source_plan_id,
  sourceTrainingDayId: row.source_training_day_id,
  planNameSnapshot: row.plan_name_snapshot,
  trainingDayNameSnapshot: row.training_day_name_snapshot,
  status: row.status,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  durationSec: row.duration_sec,
  comment: row.comment ?? null,
  feedback:
    row.feedback_energy || row.feedback_difficulty || row.feedback_note
      ? {
          ...(row.feedback_energy ? { energy: row.feedback_energy } : {}),
          ...(row.feedback_difficulty ? { difficulty: row.feedback_difficulty } : {}),
          ...(row.feedback_note ? { note: row.feedback_note } : {}),
        }
      : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toExercise = (row: ExerciseRow): WorkoutExercise => ({
  id: row.id,
  workoutSessionId: row.workout_session_id,
  sourcePlannedExerciseId: row.source_planned_exercise_id,
  exerciseId: row.exercise_id ?? null,
  nameSnapshot: row.name_snapshot,
  noteSnapshot: row.note_snapshot,
  metricType: row.metric_type ?? 'reps',
  measurementType:
    row.measurement_type ?? (row.metric_type === 'duration' ? 'duration' : 'weight_reps'),
  weightMode: row.weight_mode ?? (row.metric_type === 'duration' ? null : 'total'),
  order: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSet = (row: SetRow): WorkoutSet => ({
  id: row.id,
  workoutExerciseId: row.workout_exercise_id,
  setIndex: row.set_index,
  targetWeight: row.target_weight,
  targetReps: row.target_reps,
  targetDurationSec: row.target_duration_sec ?? null,
  actualWeight: row.actual_weight,
  actualReps: row.actual_reps,
  actualDurationSec: row.actual_duration_sec ?? null,
  effort: row.effort ?? null,
  exerciseStartedAt: row.exercise_started_at ?? null,
  completed: row.completed === 1,
  completedAt: row.completed_at,
  restStartedAt: row.rest_started_at ?? null,
  restFinishedAt: row.rest_finished_at ?? null,
  restDurationSec: row.rest_duration_sec ?? null,
  restTargetSec: row.rest_target_sec ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class WorkoutRepository {
  constructor(private readonly db: Database) {}

  async createSession(input: {
    sourcePlanId: string | null;
    sourceTrainingDayId: string | null;
    planNameSnapshot: string | null;
    trainingDayNameSnapshot: string | null;
  }): Promise<WorkoutSession> {
    const timestamp = nowIso();
    const session: WorkoutSession = {
      id: createId(),
      sourcePlanId: input.sourcePlanId,
      sourceTrainingDayId: input.sourceTrainingDayId,
      planNameSnapshot: input.planNameSnapshot,
      trainingDayNameSnapshot: input.trainingDayNameSnapshot,
      status: 'planned',
      startedAt: timestamp,
      finishedAt: null,
      durationSec: null,
      comment: null,
      feedback: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO workout_sessions
       (id, source_plan_id, source_training_day_id, plan_name_snapshot, training_day_name_snapshot, status, started_at, finished_at, duration_sec, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.sourcePlanId,
        session.sourceTrainingDayId,
        session.planNameSnapshot,
        session.trainingDayNameSnapshot,
        session.status,
        session.startedAt,
        session.finishedAt,
        session.durationSec,
        session.createdAt,
        session.updatedAt,
      ],
    );
    return session;
  }

  async addExercise(input: {
    workoutSessionId: string;
    sourcePlannedExerciseId: string | null;
    exerciseId?: string | null;
    nameSnapshot: string;
    noteSnapshot: string | null;
    metricType?: ExerciseMetricType;
    measurementType?: MeasurementType;
    weightMode?: WeightMode | null;
    order: number;
  }): Promise<WorkoutExercise> {
    const timestamp = nowIso();
    const exercise: WorkoutExercise = {
      id: createId(),
      workoutSessionId: input.workoutSessionId,
      sourcePlannedExerciseId: input.sourcePlannedExerciseId,
      exerciseId: input.exerciseId ?? null,
      nameSnapshot: input.nameSnapshot,
      noteSnapshot: input.noteSnapshot,
      metricType: input.metricType ?? 'reps',
      measurementType:
        input.measurementType ?? (input.metricType === 'duration' ? 'duration' : 'weight_reps'),
      weightMode:
        input.measurementType === 'duration' || input.metricType === 'duration'
          ? null
          : input.weightMode ?? 'total',
      order: input.order,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO workout_exercises
       (id, workout_session_id, source_planned_exercise_id, exercise_id, name_snapshot, note_snapshot,
        metric_type, measurement_type, weight_mode, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        exercise.workoutSessionId,
        exercise.sourcePlannedExerciseId,
        exercise.exerciseId,
        exercise.nameSnapshot,
        exercise.noteSnapshot,
        exercise.metricType,
        exercise.measurementType,
        exercise.weightMode,
        exercise.order,
        exercise.createdAt,
        exercise.updatedAt,
      ],
    );
    return exercise;
  }

  async addSet(input: {
    workoutExerciseId: string;
    setIndex: number;
    targetWeight: number | null;
    targetReps: number | null;
    targetDurationSec?: number | null;
    actualWeight: number;
    actualReps: number;
    actualDurationSec?: number | null;
  }): Promise<WorkoutSet> {
    assertNonNegative(input.actualWeight, 'Weight cannot be negative');
    assertNonNegative(input.actualReps, 'Reps cannot be negative');
    assertNonNegative(input.actualDurationSec ?? 0, 'Duration cannot be negative');
    const timestamp = nowIso();
    const set: WorkoutSet = {
      id: createId(),
      workoutExerciseId: input.workoutExerciseId,
      setIndex: input.setIndex,
      targetWeight: input.targetWeight,
      targetReps: input.targetReps,
      targetDurationSec: input.targetDurationSec ?? null,
      actualWeight: input.actualWeight,
      actualReps: input.actualReps,
      actualDurationSec: input.actualDurationSec ?? null,
      effort: null,
      exerciseStartedAt: null,
      completed: false,
      completedAt: null,
      restStartedAt: null,
      restFinishedAt: null,
      restDurationSec: null,
      restTargetSec: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO workout_sets
       (id, workout_exercise_id, set_index, target_weight, target_reps, target_duration_sec,
        actual_weight, actual_reps, actual_duration_sec, effort, completed, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        set.id,
        set.workoutExerciseId,
        set.setIndex,
        set.targetWeight,
        set.targetReps,
        set.targetDurationSec,
        set.actualWeight,
        set.actualReps,
        set.actualDurationSec,
        set.effort,
        set.completed ? 1 : 0,
        set.completedAt,
        set.createdAt,
        set.updatedAt,
      ],
    );
    return set;
  }

  async completeSet(
    setId: string,
    actualWeight: number,
    actualReps: number,
    actualDurationSec: number | null = null,
    effort: SetEffort | null = null,
  ): Promise<void> {
    assertNonNegative(actualWeight, 'Weight cannot be negative');
    assertNonNegative(actualReps, 'Reps cannot be negative');
    assertNonNegative(actualDurationSec ?? 0, 'Duration cannot be negative');
    const timestamp = nowIso();
    await this.db.transaction(async () => {
      const set = await this.getSet(setId);
      if (!set) {
        throw new AppError('Workout set was not found', 'workout.setNotFound');
      }
      const sets = await this.listSets(set.workoutExerciseId);
      const earlierPendingSet = sets.find(candidate => candidate.setIndex < set.setIndex && !candidate.completed);
      if (earlierPendingSet) {
        throw new AppError('Complete the previous set first', 'workout.setOutOfOrder');
      }
      await this.db.execute(
        'UPDATE workout_sets SET actual_weight = ?, actual_reps = ?, actual_duration_sec = ?, effort = ?, completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
        [actualWeight, actualReps, actualDurationSec, effort, 1, timestamp, timestamp, setId],
      );
      await this.prefillFirstPendingSet(set.workoutExerciseId);
    });
  }

  async updateCompletedSetResult(
    setId: string,
    actualWeight: number,
    actualReps: number,
    actualDurationSec: number | null = null,
    effort?: SetEffort | null,
  ): Promise<void> {
    assertNonNegative(actualWeight, 'Weight cannot be negative');
    assertNonNegative(actualReps, 'Reps cannot be negative');
    assertNonNegative(actualDurationSec ?? 0, 'Duration cannot be negative');
    const timestamp = nowIso();
    await this.db.transaction(async () => {
      const set = await this.getSet(setId);
      if (!set?.completed) {
        throw new AppError('Completed set was not found', 'workout.completedSetNotFound');
      }
      await this.db.execute(
        'UPDATE workout_sets SET actual_weight = ?, actual_reps = ?, actual_duration_sec = ?, effort = ?, updated_at = ? WHERE id = ? AND completed = 1',
        [actualWeight, actualReps, actualDurationSec, effort ?? set.effort, timestamp, setId],
      );
      await this.prefillFirstPendingSet(set.workoutExerciseId);
    });
  }

  async updatePendingSetValues(
    setId: string,
    input: {
      actualWeight: number;
      actualReps: number;
      actualDurationSec: number | null;
      targetDurationSec?: number | null;
    },
  ): Promise<void> {
    assertNonNegative(input.actualWeight, 'Weight cannot be negative');
    assertNonNegative(input.actualReps, 'Reps cannot be negative');
    assertNonNegative(input.actualDurationSec ?? 0, 'Duration cannot be negative');
    const timestamp = nowIso();
    await this.db.execute(
      `UPDATE workout_sets
       SET actual_weight = ?, actual_reps = ?, actual_duration_sec = ?,
           target_duration_sec = ?, updated_at = ?
       WHERE id = ? AND completed = 0`,
      [
        input.actualWeight,
        input.actualReps,
        input.actualDurationSec,
        input.targetDurationSec ?? input.actualDurationSec,
        timestamp,
        setId,
      ],
    );
  }

  async startExerciseTimer(setId: string): Promise<void> {
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET exercise_started_at = ?, updated_at = ? WHERE id = ? AND completed = 0',
      [timestamp, timestamp, setId],
    );
  }

  async stopExerciseTimer(setId: string, actualDurationSec: number): Promise<void> {
    assertNonNegative(actualDurationSec, 'Duration cannot be negative');
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET exercise_started_at = ?, actual_duration_sec = ?, updated_at = ? WHERE id = ? AND completed = 0',
      [null, actualDurationSec, timestamp, setId],
    );
  }

  async updateExerciseNote(exerciseId: string, note: string): Promise<void> {
    const exercise = (await this.db.getFirst<ExerciseRow>(
      'SELECT * FROM workout_exercises WHERE id = ?',
      [exerciseId],
    ));
    if (!exercise) {
      throw new AppError('Workout exercise was not found', 'workout.exerciseNotFound');
    }
    const normalizedNote = note.trim() || null;
    const timestamp = nowIso();
    await this.db.transaction(async () => {
      await this.db.execute(
        'UPDATE workout_exercises SET note_snapshot = ?, updated_at = ? WHERE id = ?',
        [normalizedNote, timestamp, exerciseId],
      );
      if (exercise.source_planned_exercise_id) {
        const relatedExerciseIds = await this.findRelatedPlannedExerciseIds(
          exercise.source_planned_exercise_id,
        );
        for (const relatedExerciseId of relatedExerciseIds) {
          await this.db.execute(
            'UPDATE planned_exercises SET note = ?, updated_at = ? WHERE id = ?',
            [normalizedNote, timestamp, relatedExerciseId],
          );
        }
        await this.updateOpenWorkoutNotes(relatedExerciseIds, normalizedNote, timestamp);
      }
    });
  }

  async getLatestCompletedExerciseSets(
    planId: string,
    sourcePlannedExerciseId: string,
    exerciseName: string,
  ): Promise<WorkoutSet[]> {
    const sessions = await this.listSessionsForPlan(planId, 100);
    const normalizedExerciseName = normalizeName(exerciseName);
    const relatedExerciseIds = new Set(
      await this.findRelatedPlannedExerciseIds(sourcePlannedExerciseId),
    );
    for (const session of sessions) {
      if (session.status !== 'completed') {
        continue;
      }
      const exercises = await this.listExercises(session.id);
      const exercise = exercises.find(candidate =>
        (candidate.sourcePlannedExerciseId !== null &&
          relatedExerciseIds.has(candidate.sourcePlannedExerciseId)) ||
        normalizeName(candidate.nameSnapshot) === normalizedExerciseName,
      );
      if (!exercise) {
        continue;
      }
      const completedSets = (await this.listSets(exercise.id)).filter(set => set.completed);
      if (completedSets.length > 0) {
        return completedSets;
      }
    }
    return [];
  }

  async startRest(setId: string, targetSec: number): Promise<void> {
    assertNonNegative(targetSec, 'Rest target cannot be negative');
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET rest_started_at = ?, rest_finished_at = ?, rest_duration_sec = ?, rest_target_sec = ?, updated_at = ? WHERE id = ?',
      [timestamp, null, null, targetSec, timestamp, setId],
    );
  }

  async updateRestTarget(setId: string, targetSec: number): Promise<void> {
    assertNonNegative(targetSec, 'Rest target cannot be negative');
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET rest_target_sec = ?, updated_at = ? WHERE id = ? AND rest_started_at IS NOT NULL AND rest_finished_at IS NULL',
      [targetSec, timestamp, setId],
    );
  }

  async finishRest(setId: string, durationSec?: number): Promise<void> {
    const set = await this.getSet(setId);
    if (!set?.restStartedAt) {
      return;
    }
    const finishedAt = nowIso();
    const actualDurationSec = durationSec ?? Math.max(
      0,
      Math.floor((new Date(finishedAt).getTime() - new Date(set.restStartedAt).getTime()) / 1000),
    );
    await this.db.execute(
      'UPDATE workout_sets SET rest_finished_at = ?, rest_duration_sec = ?, updated_at = ? WHERE id = ?',
      [finishedAt, actualDurationSec, finishedAt, setId],
    );
  }

  async updateRestDuration(setId: string, durationSec: number): Promise<void> {
    assertNonNegative(durationSec, 'Rest duration cannot be negative');
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET rest_duration_sec = ?, rest_finished_at = ?, updated_at = ? WHERE id = ?',
      [durationSec, timestamp, timestamp, setId],
    );
  }

  async resetRest(setId: string): Promise<void> {
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET rest_started_at = ?, rest_finished_at = ?, rest_duration_sec = ?, rest_target_sec = ?, updated_at = ? WHERE id = ?',
      [null, null, null, null, timestamp, setId],
    );
  }

  async finishSession(id: string, status: WorkoutSession['status'], comment?: string): Promise<void> {
    const session = await this.getSession(id);
    if (!session) {
      throw new AppError('Workout session was not found', 'workout.sessionNotFound');
    }
    if (session.finishedAt || session.status !== 'planned') {
      if (session.status === status && session.finishedAt) {
        return;
      }
      throw new AppError('Workout session is already closed', 'workout.sessionAlreadyClosed');
    }
    const finishedAt = nowIso();
    const durationSec = session.startedAt
      ? Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
      : 0;
    const result = await this.db.execute(
      `UPDATE workout_sessions
       SET status = ?, finished_at = ?, duration_sec = ?, comment = ?, updated_at = ?
       WHERE id = ? AND status = ? AND finished_at IS NULL`,
      [status, finishedAt, durationSec, comment?.trim() || null, finishedAt, id, 'planned'],
    );
    if (result.changes === 0) {
      throw new AppError('Workout session was not updated', 'workout.sessionNotUpdated');
    }
    if (status === 'completed' && session.sourcePlanId) {
      await this.closeOtherOpenSessionsForPlan(session.sourcePlanId, session.id, finishedAt);
    }
  }

  async listSessions(limit = 50): Promise<WorkoutSession[]> {
    const rows = await this.db.getAll<SessionRow>(
      `SELECT *
       FROM workout_sessions ws
       WHERE ws.source_plan_id IS NULL
          OR EXISTS (SELECT 1 FROM plans p WHERE p.id = ws.source_plan_id)
       ORDER BY started_at DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map(toSession);
  }

  async listSessionsForActivePlan(limit = 50): Promise<WorkoutSession[]> {
    const activePlanId = await this.getActivePlanId();
    if (!activePlanId) {
      return [];
    }

    return this.listSessionsForPlan(activePlanId, limit);
  }

  async listFinishedSessionsForActivePlan(limit = 50): Promise<WorkoutSession[]> {
    const sessions = await this.listSessionsForActivePlan(limit);
    return sessions.filter(session => session.finishedAt);
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.transaction(async () => {
      await this.deleteSessionRows(id);
    });
    await this.assertSessionDeleted(id);
  }

  async clearFinishedSessionsForActivePlan(): Promise<number> {
    const sessions = await this.listFinishedSessionsForActivePlan(500);
    await this.db.transaction(async () => {
      for (const session of sessions) {
        await this.deleteSessionRows(session.id);
      }
    });
    const remaining = await this.listFinishedSessionsForActivePlan(500);
    if (remaining.some(session => sessions.some(deleted => deleted.id === session.id))) {
      throw new AppError('Workout history was not fully cleared', 'workout.historyNotCleared');
    }
    return sessions.length;
  }

  async getOpenSessionForActivePlan(): Promise<WorkoutSession | null> {
    const activePlanId = await this.getActivePlanId();
    if (!activePlanId) {
      return null;
    }

    const sessions = await this.listSessionsForPlan(activePlanId, 20);
    return sessions.find(session => session.status === 'planned' && !session.finishedAt) ?? null;
  }

  async listSessionsForPlan(planId: string, limit = 50): Promise<WorkoutSession[]> {
    const rows = await this.db.getAll<SessionRow>(
      `SELECT *
       FROM workout_sessions
       WHERE source_plan_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
      [planId, limit],
    );
    return rows.map(toSession);
  }

  async getSession(id: string): Promise<WorkoutSession | null> {
    const row = await this.db.getFirst<SessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [id]);
    return row ? toSession(row) : null;
  }

  async getDetails(id: string): Promise<WorkoutDetails | null> {
    const session = await this.getSession(id);
    if (!session) {
      return null;
    }
    const exercises = await this.listExercises(id);
    const withSets = await Promise.all(
      exercises.map(async exercise => ({
        ...exercise,
        sets: await this.listSets(exercise.id),
      })),
    );
    return { session, exercises: withSets };
  }

  async listExercises(workoutSessionId: string): Promise<WorkoutExercise[]> {
    const rows = await this.db.getAll<ExerciseRow>(
      'SELECT * FROM workout_exercises WHERE workout_session_id = ? ORDER BY sort_order ASC',
      [workoutSessionId],
    );
    return rows.map(toExercise);
  }

  async listSets(workoutExerciseId: string): Promise<WorkoutSet[]> {
    const rows = await this.db.getAll<SetRow>(
      'SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_index ASC',
      [workoutExerciseId],
    );
    return rows.map(toSet);
  }

  async getSet(id: string): Promise<WorkoutSet | null> {
    const row = await this.db.getFirst<SetRow>('SELECT * FROM workout_sets WHERE id = ?', [id]);
    return row ? toSet(row) : null;
  }

  private async prefillFirstPendingSet(workoutExerciseId: string): Promise<void> {
    const sets = await this.listSets(workoutExerciseId);
    const pendingSet = sets.find(set => !set.completed);
    if (!pendingSet) {
      return;
    }
    const previousCompletedSet = sets
      .filter(set => set.completed && set.setIndex < pendingSet.setIndex)
      .slice(-1)[0];
    if (!previousCompletedSet) {
      return;
    }
    await this.updatePendingSetValues(pendingSet.id, {
      actualWeight: previousCompletedSet.actualWeight,
      actualReps: previousCompletedSet.actualReps,
      actualDurationSec: previousCompletedSet.actualDurationSec,
      targetDurationSec: previousCompletedSet.actualDurationSec,
    });
  }

  private async deleteSessionRows(id: string): Promise<void> {
    const exercises = await this.listExercises(id);
    for (const exercise of exercises) {
      await this.db.execute('DELETE FROM workout_sets WHERE workout_exercise_id = ?', [exercise.id]);
    }
    await this.db.execute('DELETE FROM workout_exercises WHERE workout_session_id = ?', [id]);
    await this.db.execute('DELETE FROM workout_sessions WHERE id = ?', [id]);
  }

  private async assertSessionDeleted(id: string): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      throw new AppError('Workout session was not deleted', 'workout.sessionNotDeleted');
    }
  }

  private async closeOtherOpenSessionsForPlan(planId: string, exceptSessionId: string, finishedAt: string): Promise<void> {
    const openSessions = (await this.listSessionsForPlan(planId, 100)).filter(
      session => session.id !== exceptSessionId && session.status === 'planned' && !session.finishedAt,
    );
    await Promise.all(
      openSessions.map(session => {
        const durationSec = session.startedAt
          ? Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
          : 0;
        return this.db.execute(
          'UPDATE workout_sessions SET status = ?, finished_at = ?, duration_sec = ?, updated_at = ? WHERE id = ?',
          ['interrupted', finishedAt, durationSec, finishedAt, session.id],
        );
      }),
    );
  }

  private async getActivePlanId(): Promise<string | null> {
    const row = await this.db.getFirst<ActivePlanRow>('SELECT id FROM plans WHERE status = ? LIMIT 1', [
      'active',
    ]);
    return row?.id ?? null;
  }

  private async findRelatedPlannedExerciseIds(sourcePlannedExerciseId: string): Promise<string[]> {
    const source = await this.db.getFirst<PlannedExerciseRow>(
      'SELECT * FROM planned_exercises WHERE id = ?',
      [sourcePlannedExerciseId],
    );
    if (!source) {
      return [];
    }
    const sourceDay = await this.db.getFirst<TrainingDayRow>(
      'SELECT * FROM training_days WHERE id = ?',
      [source.training_day_id],
    );
    if (!sourceDay) {
      return [source.id];
    }
    const days = await this.db.getAll<TrainingDayRow>(
      'SELECT * FROM training_days WHERE plan_id = ? ORDER BY sort_order ASC',
      [sourceDay.plan_id],
    );
    const normalizedSourceName = normalizeName(source.name);
    const relatedIds: string[] = [];
    for (const day of days) {
      const exercises = await this.db.getAll<PlannedExerciseRow>(
        'SELECT * FROM planned_exercises WHERE training_day_id = ? ORDER BY sort_order ASC',
        [day.id],
      );
      relatedIds.push(
        ...exercises
          .filter(exercise => normalizeName(exercise.name) === normalizedSourceName)
          .map(exercise => exercise.id),
      );
    }
    return relatedIds;
  }

  private async updateOpenWorkoutNotes(
    sourcePlannedExerciseIds: string[],
    note: string | null,
    timestamp: string,
  ): Promise<void> {
    const relatedIds = new Set(sourcePlannedExerciseIds);
    const sessions = await this.listSessions(500);
    const openSessions = sessions.filter(session => session.status === 'planned' && !session.finishedAt);
    for (const session of openSessions) {
      const exercises = await this.listExercises(session.id);
      for (const exercise of exercises) {
        if (exercise.sourcePlannedExerciseId && relatedIds.has(exercise.sourcePlannedExerciseId)) {
          await this.db.execute(
            'UPDATE workout_exercises SET note_snapshot = ?, updated_at = ? WHERE id = ?',
            [note, timestamp, exercise.id],
          );
        }
      }
    }
  }
}
