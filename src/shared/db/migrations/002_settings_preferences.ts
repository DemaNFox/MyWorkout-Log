import type { Database } from '../types';

export const settingsPreferencesMigration = {
  id: 2,
  async up(db: Database): Promise<void> {
    await db.execute("ALTER TABLE settings ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'light'");
    await db.execute("ALTER TABLE settings ADD COLUMN timer_alert TEXT NOT NULL DEFAULT 'vibrate'");
  },
};
