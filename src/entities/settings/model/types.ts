import type { WeightUnit } from '@shared/types/domain';
import type { ThemeMode } from '@shared/ui/theme';

export type TimerAlertMode = 'silent' | 'vibrate';

export interface UserSettings {
  id: 'default';
  weightUnit: WeightUnit;
  defaultRestSec: number;
  dateFormat: string | null;
  themeMode: ThemeMode;
  timerAlert: TimerAlertMode;
  createdAt: string;
  updatedAt: string;
}
