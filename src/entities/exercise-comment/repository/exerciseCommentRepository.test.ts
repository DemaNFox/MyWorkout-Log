import { MemoryDatabase } from '@shared/testing/memoryDatabase';

import { ExerciseCommentRepository } from './exerciseCommentRepository';

describe('ExerciseCommentRepository', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps a global change log and skips unchanged text', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-13T10:00:00.000Z'));
    const db = new MemoryDatabase();
    await db.execute('CREATE TABLE IF NOT EXISTS exercise_comment_entries (id TEXT PRIMARY KEY);');
    const repository = new ExerciseCommentRepository(db);

    await expect(repository.save('back-squat', '  Keep the chest up  ')).resolves.not.toBeNull();
    await expect(repository.save('back-squat', 'Keep the chest up')).resolves.toBeNull();
    jest.setSystemTime(new Date('2026-08-13T10:00:01.000Z'));
    await expect(repository.save('back-squat', 'Use a narrower stance')).resolves.not.toBeNull();

    const entries = await repository.list('back-squat');
    expect(entries).toHaveLength(2);
    expect(entries.map(entry => entry.text)).toEqual([
      'Use a narrower stance',
      'Keep the chest up',
    ]);
  });

  it('imports entries idempotently', async () => {
    const db = new MemoryDatabase();
    await db.execute('CREATE TABLE IF NOT EXISTS exercise_comment_entries (id TEXT PRIMARY KEY);');
    const repository = new ExerciseCommentRepository(db);
    const entry = {
      id: 'comment-1',
      exerciseId: 'deadlift',
      text: 'Brace before pulling',
      createdAt: '2026-08-13T10:00:00.000Z',
    };

    await expect(repository.import([entry])).resolves.toBe(1);
    await expect(repository.import([entry])).resolves.toBe(0);
  });
});
