import { PlanRepository } from '@entities/plan/repository/planRepository';
import { TrainingDayRepository } from '@entities/training-day/repository/trainingDayRepository';
import { runMigrations } from '@shared/db/migrations';
import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { ExerciseCatalogRepository } from './exerciseCatalogRepository';

const customExercise = {
  name: 'Single-arm landmine press',
  equipmentType: 'barbell' as const,
  primaryMuscle: 'shoulders' as const,
  movementType: 'vertical_press' as const,
  defaultMeasurementType: 'weight_reps' as const,
  defaultWeightMode: 'total' as const,
};

describe('ExerciseCatalogRepository', () => {
  it('creates and edits a custom exercise without changing its stable ID', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const repository = new ExerciseCatalogRepository(db);

    const created = await repository.create(customExercise);
    await repository.update(created.id, { ...customExercise, name: 'Half-kneeling landmine press' });

    await expect(repository.getById(created.id)).resolves.toMatchObject({
      id: created.id,
      name: 'Half-kneeling landmine press',
      equipmentType: 'barbell',
      isCustom: true,
    });
  });

  it('uses custom exercises in plans and protects referenced records from deletion', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const catalog = new ExerciseCatalogRepository(db);
    const custom = await catalog.create(customExercise);
    const plan = await new PlanRepository(db).create('Program');
    const days = new TrainingDayRepository(db);
    const day = await days.createDay(plan.id, 'Day');

    const planned = await days.addExercise({
      trainingDayId: day.id,
      exerciseId: custom.id,
      name: custom.name,
      targetSets: 3,
      targetReps: 8,
      targetWeight: 20,
    });

    expect(planned).toMatchObject({
      exerciseId: custom.id,
      measurementType: 'weight_reps',
      weightMode: 'total',
    });
    await expect(catalog.delete(custom.id)).rejects.toMatchObject({ code: 'exercise.inUse' });
  });

  it('deletes an unused custom exercise', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);
    const repository = new ExerciseCatalogRepository(db);
    const custom = await repository.create({
      ...customExercise,
      name: 'Temporary exercise',
      equipmentType: 'bodyweight',
      defaultMeasurementType: 'bodyweight_reps',
      defaultWeightMode: null,
    });

    await repository.delete(custom.id);

    await expect(repository.getById(custom.id)).resolves.toBeNull();
  });

  it('protects the built-in exercise catalog from deletion', async () => {
    const db = new MemoryDatabase();
    await runMigrations(db);

    await expect(
      new ExerciseCatalogRepository(db).delete('barbell-bench-press'),
    ).rejects.toMatchObject({ code: 'exercise.builtInProtected' });
  });
});
