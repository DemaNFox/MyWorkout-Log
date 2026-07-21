import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { BodyMetricRepository } from './bodyMetricRepository';

describe('BodyMetricRepository', () => {
  it('stores body metrics separately from workout sessions', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const repository = new BodyMetricRepository(db);

    await repository.create({ measuredAt: '2026-07-21', bodyWeight: 74.2, waist: 84 });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ measuredAt: '2026-07-21', bodyWeight: 74.2, waist: 84 }),
    ]);
    expect(db.tables.get('workout_sessions')).toEqual([]);
  });

  it('rejects an empty measurement', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    await expect(new BodyMetricRepository(db).create({ measuredAt: '2026-07-21' })).rejects.toMatchObject({
      code: 'bodyMetric.measurementRequired',
    });
  });
});
