import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { PlanRepository } from './planRepository';

describe('PlanRepository', () => {
  it('keeps only one active plan', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const repository = new PlanRepository(db);

    const first = await repository.create('First');
    const second = await repository.create('Second');

    await repository.activate(first.id);
    await repository.activate(second.id);

    const plans = await repository.list();
    expect(plans.find(plan => plan.id === first.id)?.status).toBe('inactive');
    expect(plans.find(plan => plan.id === second.id)?.status).toBe('active');
  });
});
