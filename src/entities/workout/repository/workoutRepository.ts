import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { assertNonNegative } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';

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
  created_at: string;
  updated_at: string;
};

type ExerciseRow = {
  id: string;
  workout_session_id: string;
  source_planned_exercise_id: string | null;
  name_snapshot: string;
  note_snapshot: string | null;
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
  actual_weight: number;
  actual_reps: number;
  completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActivePlanRow = {
  id: string;
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
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toExercise = (row: ExerciseRow): WorkoutExercise => ({
  id: row.id,
  workoutSessionId: row.workout_session_id,
  sourcePlannedExerciseId: row.source_planned_exercise_id,
  nameSnapshot: row.name_snapshot,
  noteSnapshot: row.note_snapshot,
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
  actualWeight: row.actual_weight,
  actualReps: row.actual_reps,
  completed: row.completed === 1,
  completedAt: row.completed_at,
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
    nameSnapshot: string;
    noteSnapshot: string | null;
    order: number;
  }): Promise<WorkoutExercise> {
    const timestamp = nowIso();
    const exercise: WorkoutExercise = {
      id: createId(),
      workoutSessionId: input.workoutSessionId,
      sourcePlannedExerciseId: input.sourcePlannedExerciseId,
      nameSnapshot: input.nameSnapshot,
      noteSnapshot: input.noteSnapshot,
      order: input.order,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO workout_exercises
       (id, workout_session_id, source_planned_exercise_id, name_snapshot, note_snapshot, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exercise.id,
        exercise.workoutSessionId,
        exercise.sourcePlannedExerciseId,
        exercise.nameSnapshot,
        exercise.noteSnapshot,
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
    actualWeight: number;
    actualReps: number;
  }): Promise<WorkoutSet> {
    assertNonNegative(input.actualWeight, 'Weight cannot be negative');
    assertNonNegative(input.actualReps, 'Reps cannot be negative');
    const timestamp = nowIso();
    const set: WorkoutSet = {
      id: createId(),
      workoutExerciseId: input.workoutExerciseId,
      setIndex: input.setIndex,
      targetWeight: input.targetWeight,
      targetReps: input.targetReps,
      actualWeight: input.actualWeight,
      actualReps: input.actualReps,
      completed: false,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO workout_sets
       (id, workout_exercise_id, set_index, target_weight, target_reps, actual_weight, actual_reps, completed, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        set.id,
        set.workoutExerciseId,
        set.setIndex,
        set.targetWeight,
        set.targetReps,
        set.actualWeight,
        set.actualReps,
        set.completed ? 1 : 0,
        set.completedAt,
        set.createdAt,
        set.updatedAt,
      ],
    );
    return set;
  }

  async completeSet(setId: string, actualWeight: number, actualReps: number): Promise<void> {
    assertNonNegative(actualWeight, 'Weight cannot be negative');
    assertNonNegative(actualReps, 'Reps cannot be negative');
    const timestamp = nowIso();
    await this.db.execute(
      'UPDATE workout_sets SET actual_weight = ?, actual_reps = ?, completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [actualWeight, actualReps, 1, timestamp, timestamp, setId],
    );
  }

  async finishSession(id: string, status: WorkoutSession['status']): Promise<void> {
    const session = await this.getSession(id);
    const finishedAt = nowIso();
    const durationSec = session?.startedAt
      ? Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000))
      : 0;
    await this.db.execute(
      'UPDATE workout_sessions SET status = ?, finished_at = ?, duration_sec = ?, updated_at = ? WHERE id = ?',
      [status, finishedAt, durationSec, finishedAt, id],
    );
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

    const rows = await this.db.getAll<SessionRow>(
      `SELECT *
       FROM workout_sessions
       WHERE source_plan_id = ?
       ORDER BY started_at DESC
       LIMIT ?`,
      [activePlanId, limit],
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

  private async getActivePlanId(): Promise<string | null> {
    const row = await this.db.getFirst<ActivePlanRow>('SELECT id FROM plans WHERE status = ? LIMIT 1', [
      'active',
    ]);
    return row?.id ?? null;
  }
}
