import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';
import { AppError, assertNonNegative } from '@shared/lib/errors';
import { createId } from '@shared/lib/id';

import type { BodyMetricEntry } from '../model/types';

type BodyMetricRow = {
  id: string;
  measured_at: string;
  body_weight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  arm: number | null;
  thigh: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const toEntry = (row: BodyMetricRow): BodyMetricEntry => ({
  id: row.id,
  measuredAt: row.measured_at,
  bodyWeight: row.body_weight,
  waist: row.waist,
  chest: row.chest,
  hips: row.hips,
  arm: row.arm,
  thigh: row.thigh,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class BodyMetricRepository {
  constructor(private readonly db: Database) {}

  async create(input: {
    measuredAt: string;
    bodyWeight?: number | null;
    waist?: number | null;
    chest?: number | null;
    hips?: number | null;
    arm?: number | null;
    thigh?: number | null;
    note?: string | null;
  }): Promise<BodyMetricEntry> {
    const measurements = [
      input.bodyWeight,
      input.waist,
      input.chest,
      input.hips,
      input.arm,
      input.thigh,
    ];
    measurements.forEach(value => assertNonNegative(value ?? 0, 'Body measurements cannot be negative'));
    if (!input.measuredAt.trim()) {
      throw new AppError('Measurement date is required', 'bodyMetric.dateRequired');
    }
    if (measurements.every(value => value === null || value === undefined)) {
      throw new AppError('Add at least one measurement', 'bodyMetric.measurementRequired');
    }
    const timestamp = nowIso();
    const entry: BodyMetricEntry = {
      id: createId(),
      measuredAt: input.measuredAt,
      bodyWeight: input.bodyWeight ?? null,
      waist: input.waist ?? null,
      chest: input.chest ?? null,
      hips: input.hips ?? null,
      arm: input.arm ?? null,
      thigh: input.thigh ?? null,
      note: input.note?.trim() || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO body_metrics
       (id, measured_at, body_weight, waist, chest, hips, arm, thigh, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.measuredAt,
        entry.bodyWeight,
        entry.waist,
        entry.chest,
        entry.hips,
        entry.arm,
        entry.thigh,
        entry.note,
        entry.createdAt,
        entry.updatedAt,
      ],
    );
    return entry;
  }

  async list(): Promise<BodyMetricEntry[]> {
    const rows = await this.db.getAll<BodyMetricRow>(
      'SELECT * FROM body_metrics ORDER BY measured_at DESC, created_at DESC',
    );
    return rows.map(toEntry);
  }
}
