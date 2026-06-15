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
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.execute(
      `INSERT INTO settings
       (id, weight_unit, default_rest_sec, date_format, theme_mode, timer_alert, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.id,
        settings.weightUnit,
        settings.defaultRestSec,
        settings.dateFormat,
        settings.themeMode,
        settings.timerAlert,
        settings.createdAt,
        settings.updatedAt,
      ],
    );
    return settings;
  }

  async update(
    input: Pick<UserSettings, 'weightUnit' | 'defaultRestSec' | 'dateFormat' | 'themeMode' | 'timerAlert'>,
  ): Promise<void> {
    await this.get();
    await this.db.execute(
      `UPDATE settings
       SET weight_unit = ?, default_rest_sec = ?, date_format = ?, theme_mode = ?, timer_alert = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.weightUnit,
        input.defaultRestSec,
        input.dateFormat,
        input.themeMode,
        input.timerAlert,
        nowIso(),
        'default',
      ],
    );
  }
}
