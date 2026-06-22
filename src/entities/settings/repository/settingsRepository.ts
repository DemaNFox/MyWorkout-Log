import type { Database } from '@shared/db/types';
import { nowIso } from '@shared/lib/date';

import type { UserSettings } from '../model/types';

type SettingsRow = {
  id: 'default';
  weight_unit: UserSettings['weightUnit'];
  default_rest_sec: number;
  date_format: string | null;
  theme_mode?: UserSettings['themeMode'];
  timer_alert?: UserSettings['timerAlert'];
  timer_sound_uri?: string | null;
  timer_sound_title?: string | null;
  timer_sound_volume?: number;
  rest_preset_1_sec?: number;
  rest_preset_2_sec?: number;
  rest_preset_3_sec?: number;
  created_at: string;
  updated_at: string;
};

const toSettings = (row: SettingsRow): UserSettings => ({
  id: row.id,
  weightUnit: row.weight_unit,
  defaultRestSec: row.default_rest_sec,
  dateFormat: row.date_format,
  themeMode: row.theme_mode ?? 'light',
  timerAlert: row.timer_alert ?? 'vibrate',
  timerSoundUri: row.timer_sound_uri ?? null,
  timerSoundTitle: row.timer_sound_title ?? null,
  timerSoundVolume: row.timer_sound_volume ?? 1,
  restPreset1Sec: row.rest_preset_1_sec ?? 60,
  restPreset2Sec: row.rest_preset_2_sec ?? 90,
  restPreset3Sec: row.rest_preset_3_sec ?? 120,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SettingsRepository {
  constructor(private readonly db: Database) {}

  async get(): Promise<UserSettings> {
    const row = await this.db.getFirst<SettingsRow>('SELECT * FROM settings WHERE id = ?', ['default']);
    if (row) {
      return toSettings(row);
    }
    const timestamp = nowIso();
    const settings: UserSettings = {
      id: 'default',
      weightUnit: 'kg',
      defaultRestSec: 90,
      dateFormat: 'dd.MM.yyyy',
      themeMode: 'light',
      timerAlert: 'vibrate',
      timerSoundUri: null,
      timerSoundTitle: null,
      timerSoundVolume: 1,
      restPreset1Sec: 60,
      restPreset2Sec: 90,
      restPreset3Sec: 120,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO settings
       (id, weight_unit, default_rest_sec, date_format, theme_mode, timer_alert, timer_sound_uri, timer_sound_title, timer_sound_volume, rest_preset_1_sec, rest_preset_2_sec, rest_preset_3_sec, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.id,
        settings.weightUnit,
        settings.defaultRestSec,
        settings.dateFormat,
        settings.themeMode,
        settings.timerAlert,
        settings.timerSoundUri,
        settings.timerSoundTitle,
        settings.timerSoundVolume,
        settings.restPreset1Sec,
        settings.restPreset2Sec,
        settings.restPreset3Sec,
        settings.createdAt,
        settings.updatedAt,
      ],
    );
    return settings;
  }

  async update(
    input: Pick<
      UserSettings,
      | 'weightUnit'
      | 'defaultRestSec'
      | 'dateFormat'
      | 'themeMode'
      | 'timerAlert'
      | 'timerSoundUri'
      | 'timerSoundTitle'
      | 'timerSoundVolume'
      | 'restPreset1Sec'
      | 'restPreset2Sec'
      | 'restPreset3Sec'
    >,
  ): Promise<void> {
    await this.get();
    await this.db.execute(
      `UPDATE settings
       SET weight_unit = ?, default_rest_sec = ?, date_format = ?, theme_mode = ?, timer_alert = ?, timer_sound_uri = ?, timer_sound_title = ?, timer_sound_volume = ?, rest_preset_1_sec = ?, rest_preset_2_sec = ?, rest_preset_3_sec = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.weightUnit,
        input.defaultRestSec,
        input.dateFormat,
        input.themeMode,
        input.timerAlert,
        input.timerSoundUri,
        input.timerSoundTitle,
        input.timerSoundVolume,
        input.restPreset1Sec,
        input.restPreset2Sec,
        input.restPreset3Sec,
        nowIso(),
        'default',
      ],
    );
  }
}
