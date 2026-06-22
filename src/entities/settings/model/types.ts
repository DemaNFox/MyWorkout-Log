import type { WeightUnit } from '@shared/types/domain';
import type { ThemeMode } from '@shared/ui/theme';

export type TimerAlertMode = 'silent' | 'vibrate' | 'sound' | 'sound-vibrate';

export interface UserSettings {
  id: 'default';
  weightUnit: WeightUnit;
  defaultRestSec: number;
  dateFormat: string | null;
  themeMode: ThemeMode;
  timerAlert: TimerAlertMode;
  timerSoundUri: string | null;
  timerSoundTitle: string | null;
  timerSoundVolume: number;
  restPreset1Sec: number;
  restPreset2Sec: number;
  restPreset3Sec: number;
  createdAt: string;
  updatedAt: string;
}
