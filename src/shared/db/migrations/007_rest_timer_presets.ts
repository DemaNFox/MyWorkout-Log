import type { Database } from '../types';

export const restTimerPresetsMigration = {
  id: 7,
  async up(db: Database): Promise<void> {
    await db.execute('ALTER TABLE settings ADD COLUMN rest_preset_1_sec INTEGER NOT NULL DEFAULT 60');
    await db.execute('ALTER TABLE settings ADD COLUMN rest_preset_2_sec INTEGER NOT NULL DEFAULT 90');
    await db.execute('ALTER TABLE settings ADD COLUMN rest_preset_3_sec INTEGER NOT NULL DEFAULT 120');
  },
};
