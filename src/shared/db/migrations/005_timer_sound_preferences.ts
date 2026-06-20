import type { Database } from '../types';

export const timerSoundPreferencesMigration = {
  id: 5,
  async up(db: Database): Promise<void> {
    await db.execute('ALTER TABLE settings ADD COLUMN timer_sound_uri TEXT');
    await db.execute('ALTER TABLE settings ADD COLUMN timer_sound_title TEXT');
    await db.execute('ALTER TABLE settings ADD COLUMN timer_sound_volume REAL NOT NULL DEFAULT 1');
  },
};
