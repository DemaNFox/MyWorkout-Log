import { nowIso } from '../../lib/date';
import type { Database } from '../types';
import { initialSchemaMigration } from './001_initial_schema';
import { settingsPreferencesMigration } from './002_settings_preferences';
import { pruneOrphanWorkoutHistoryMigration } from './003_prune_orphan_workout_history';
import { workoutSetRestTrackingMigration } from './004_workout_set_rest_tracking';
import { timerSoundPreferencesMigration } from './005_timer_sound_preferences';
import { workoutSetRestTargetMigration } from './006_workout_set_rest_target';
import { restTimerPresetsMigration } from './007_rest_timer_presets';

const migrations = [
  initialSchemaMigration,
  settingsPreferencesMigration,
  pruneOrphanWorkoutHistoryMigration,
  workoutSetRestTrackingMigration,
  timerSoundPreferencesMigration,
  workoutSetRestTargetMigration,
  restTimerPresetsMigration,
] as const;

type MigrationRow = { id: number };

export const runMigrations = async (db: Database): Promise<void> => {
  await db.execute(
    'CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);',
  );

  for (const migration of migrations) {
    const applied = await db.getFirst<MigrationRow>('SELECT id FROM migrations WHERE id = ?', [
      migration.id,
    ]);
    if (applied) {
      continue;
    }
    await db.transaction(async () => {
      await migration.up(db);
      await db.execute('INSERT INTO migrations (id, applied_at) VALUES (?, ?)', [
        migration.id,
        nowIso(),
      ]);
    });
  }
};
