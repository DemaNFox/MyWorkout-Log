import type { Database } from '../types';

export const workoutSessionCommentMigration = {
  id: 10,
  async up(db: Database): Promise<void> {
    await db.execute('ALTER TABLE workout_sessions ADD COLUMN comment TEXT;');
  },
};
