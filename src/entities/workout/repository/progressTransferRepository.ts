import type { Database } from '@shared/db/types';
import { normalizeName } from '@shared/lib/normalizeName';
import type { ExerciseMetricType, MeasurementType, WeightMode } from '@shared/types/domain';

import type { WorkoutSet } from '../model/types';

export interface BaselineSet {
  setIndex: number;
  actualWeight: number;
  actualReps: number;
  actualDurationSec: number | null;
}

type BaselineRow = {
  exercise_id: string | null;
  normalized_name: string;
  metric_type: ExerciseMetricType;
  measurement_type: MeasurementType;
  weight_mode: WeightMode | null;
  set_index: number;
  actual_weight: number;
  actual_reps: number;
  actual_duration_sec: number | null;
};

interface BaselineExerciseIdentity {
  id: string;
  exerciseId: string | null;
  name: string;
  metricType: ExerciseMetricType;
  measurementType: MeasurementType;
  weightMode: WeightMode | null;
}

const decisionId = 'progress-transfer-v1';

export class ProgressTransferRepository {
  constructor(private readonly db: Database) {}

  async hasDecision(): Promise<boolean> {
    return (await this.db.getFirst<{ id: string }>('SELECT id FROM app_flags WHERE id = ?', [decisionId])) !== null;
  }

  async saveDecision(value: 'accepted' | 'declined'): Promise<void> {
    await this.db.execute('INSERT INTO app_flags (id, value) VALUES (?, ?)', [decisionId, value]);
  }

  async getBaselineSets(exercise: BaselineExerciseIdentity): Promise<BaselineSet[]> {
    const rows = await this.db.getAll<BaselineRow>(
      'SELECT * FROM progress_transfer_baselines WHERE planned_exercise_id = ? ORDER BY set_index ASC',
      [exercise.id],
    );
    return rows
      .filter(row => row.metric_type === exercise.metricType &&
        row.measurement_type === exercise.measurementType &&
        (exercise.measurementType !== 'weight_reps' || row.weight_mode === exercise.weightMode) &&
        (row.exercise_id !== null && exercise.exerciseId !== null
          ? row.exercise_id === exercise.exerciseId
          : row.exercise_id === null && exercise.exerciseId === null && row.normalized_name === normalizeName(exercise.name)))
      .map(row => ({
        setIndex: row.set_index,
        actualWeight: row.actual_weight,
        actualReps: row.actual_reps,
        actualDurationSec: row.actual_duration_sec,
      }));
  }

  async saveBaselineSets(exercise: BaselineExerciseIdentity, sets: WorkoutSet[]): Promise<void> {
    for (const set of sets) {
      await this.db.execute(
        `INSERT INTO progress_transfer_baselines
         (id, planned_exercise_id, exercise_id, normalized_name, metric_type, measurement_type, weight_mode, set_index, actual_weight, actual_reps, actual_duration_sec, source_workout_set_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${exercise.id}:${set.setIndex}`,
          exercise.id,
          exercise.exerciseId,
          normalizeName(exercise.name),
          exercise.metricType,
          exercise.measurementType,
          exercise.weightMode,
          set.setIndex,
          set.actualWeight,
          set.actualReps,
          set.actualDurationSec,
          set.id,
        ],
      );
    }
  }
}
