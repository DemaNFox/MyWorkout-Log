import { NativeModules, PermissionsAndroid, Platform, Vibration } from 'react-native';

import type { TimerAlertMode } from '@entities/settings/model/types';

type WorkoutTimerSoundModule = {
  cancelScheduledTimerAlert?: () => void;
  dismissTimerAlert?: () => void;
  isTimerAlertActive?: () => Promise<boolean>;
  pickNotificationSound?: () => Promise<{ uri: string | null; title: string | null }>;
  playNotificationSound?: (uri: string | null, volume: number) => void;
  requestFullScreenAlertPermission?: () => Promise<boolean>;
  scheduleTimerAlert?: (delayMs: number, mode: TimerAlertMode, uri: string | null, volume: number) => void;
  showTimerAlert?: () => void;
  stopSound?: () => void;
};

const workoutTimerSound = NativeModules.WorkoutTimerSound as WorkoutTimerSoundModule | undefined;

export const playTimerAlert = (mode: TimerAlertMode, soundUri: string | null, volume: number): void => {
  if (mode !== 'silent') {
    workoutTimerSound?.showTimerAlert?.();
  }
  if (mode === 'sound' || mode === 'sound-vibrate') {
    workoutTimerSound?.playNotificationSound?.(soundUri, volume);
  }
  if (mode === 'vibrate' || mode === 'sound-vibrate') {
    Vibration.vibrate([0, 250, 150, 250]);
  }
};

export const pickTimerSound = async (): Promise<{ uri: string | null; title: string | null }> =>
  workoutTimerSound?.pickNotificationSound?.() ?? { uri: null, title: null };

let fullScreenPermissionRequested = false;

export const requestTimerAlertPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const notificationsGranted =
    Platform.Version < 33 ||
    (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)) === PermissionsAndroid.RESULTS.GRANTED;
  if (!notificationsGranted) {
    return false;
  }
  if (Platform.Version >= 34 && !fullScreenPermissionRequested) {
    fullScreenPermissionRequested = true;
    return workoutTimerSound?.requestFullScreenAlertPermission?.() ?? false;
  }
  return true;
};

export const scheduleTimerAlert = (
  delayMs: number,
  mode: TimerAlertMode,
  soundUri: string | null,
  volume: number,
): void => {
  workoutTimerSound?.scheduleTimerAlert?.(delayMs, mode, soundUri, volume);
};

export const cancelScheduledTimerAlert = (): void => {
  workoutTimerSound?.cancelScheduledTimerAlert?.();
};

export const stopTimerSound = (): void => {
  workoutTimerSound?.stopSound?.();
  workoutTimerSound?.cancelScheduledTimerAlert?.();
  workoutTimerSound?.dismissTimerAlert?.();
};

export const isNativeTimerAlertActive = async (): Promise<boolean> =>
  workoutTimerSound?.isTimerAlertActive?.() ?? false;
