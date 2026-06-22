import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useDatabase } from '@app/providers/DatabaseProvider';
import type { TimerAlertMode } from '@entities/settings/model/types';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { formatDuration } from '@shared/lib/date';
import {
  cancelScheduledTimerAlert,
  playTimerAlert,
  requestTimerAlertPermission,
  scheduleTimerAlert,
  stopTimerSound,
} from '@shared/lib/timerAlert';
import { Button } from '@shared/ui/Button';
import { useThemeColors } from '@shared/ui/theme';

interface RestTimerProps {
  autoStartKey?: number;
  onComplete?: (elapsedSec: number) => void;
  onReset?: () => void;
  onStarted?: (targetSec: number) => void;
  onStop?: (elapsedSec: number) => void;
  onTargetChanged?: (targetSec: number) => void;
  onTick?: (remainingSec: number) => void;
  resumeStartedAt?: string | null;
  resumeTargetSec?: number | null;
}

export const RestTimer = ({
  autoStartKey = 0,
  onComplete,
  onReset,
  onStarted,
  onStop,
  onTargetChanged,
  onTick,
  resumeStartedAt = null,
  resumeTargetSec = null,
}: RestTimerProps) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [selectedSec, setSelectedSec] = useState<number>(90);
  const [remainingSec, setRemainingSec] = useState<number>(90);
  const [presets, setPresets] = useState<number[]>([60, 90, 120]);
  const [customMinutes, setCustomMinutes] = useState('1');
  const [customSeconds, setCustomSeconds] = useState('30');
  const [running, setRunning] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMode, setAlertMode] = useState<TimerAlertMode>('vibrate');
  const [soundUri, setSoundUri] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState(1);
  const onCompleteRef = useRef(onComplete);
  const onResetRef = useRef(onReset);
  const onStartedRef = useRef(onStarted);
  const onStopRef = useRef(onStop);
  const onTargetChangedRef = useRef(onTargetChanged);
  const onTickRef = useRef(onTick);
  const alertModeRef = useRef(alertMode);
  const completedRef = useRef(false);
  const runningStartedAtMsRef = useRef<number | null>(null);
  const soundUriRef = useRef(soundUri);
  const soundVolumeRef = useRef(soundVolume);
  const targetSecRef = useRef(selectedSec);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onResetRef.current = onReset;
    onStartedRef.current = onStarted;
    onStopRef.current = onStop;
    onTargetChangedRef.current = onTargetChanged;
    onTickRef.current = onTick;
  }, [onComplete, onReset, onStarted, onStop, onTargetChanged, onTick]);

  useEffect(() => {
    alertModeRef.current = alertMode;
    soundUriRef.current = soundUri;
    soundVolumeRef.current = soundVolume;
    targetSecRef.current = selectedSec;
  }, [alertMode, selectedSec, soundUri, soundVolume]);

  useEffect(() => {
    void new SettingsRepository(db).get().then(settings => {
      const nextPresets = [settings.restPreset1Sec, settings.restPreset2Sec, settings.restPreset3Sec].filter(
        seconds => seconds > 0,
      );
      const defaultRestSec = settings.defaultRestSec > 0 ? settings.defaultRestSec : nextPresets[1] ?? 90;
      setPresets(nextPresets.length > 0 ? nextPresets : [60, 90, 120]);
      if (!runningStartedAtMsRef.current) {
        setSelectedSec(defaultRestSec);
        setRemainingSec(defaultRestSec);
        setCustomParts(defaultRestSec);
      }
      setAlertMode(settings.timerAlert);
      setSoundUri(settings.timerSoundUri);
      setSoundVolume(settings.timerSoundVolume);
    });
  }, [db]);

  useEffect(() => {
    if (autoStartKey <= 0) {
      return;
    }
    completedRef.current = false;
    runningStartedAtMsRef.current = Date.now();
    setRemainingSec(selectedSec);
    onTickRef.current?.(selectedSec);
    onStartedRef.current?.(selectedSec);
    void scheduleSystemAlert(selectedSec * 1000);
    setRunning(true);
  }, [autoStartKey, selectedSec]);

  useEffect(() => {
    if (!resumeStartedAt || !resumeTargetSec) {
      return;
    }
    const startedAtMs = new Date(resumeStartedAt).getTime();
    runningStartedAtMsRef.current = startedAtMs;
    targetSecRef.current = resumeTargetSec;
    completedRef.current = false;
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    const nextRemainingSec = Math.max(0, resumeTargetSec - elapsedSec);
    setSelectedSec(resumeTargetSec);
    setCustomParts(resumeTargetSec);
    setRemainingSec(nextRemainingSec);
    onTickRef.current?.(nextRemainingSec);
    if (nextRemainingSec > 0) {
      void scheduleSystemAlert(nextRemainingSec * 1000);
      setRunning(true);
      return;
    }
    completeTimer(resumeTargetSec);
  }, [resumeStartedAt, resumeTargetSec]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const syncRemaining = () => {
      const startedAtMs = runningStartedAtMsRef.current;
      const targetSec = targetSecRef.current;
      if (!startedAtMs) {
        return;
      }
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      const nextRemainingSec = Math.max(0, targetSec - elapsedSec);
      setRemainingSec(nextRemainingSec);
      onTickRef.current?.(nextRemainingSec);
      if (nextRemainingSec > 0 || completedRef.current) {
        return;
      }
      completeTimer(targetSec);
    };

    syncRemaining();
    const intervalId = setInterval(syncRemaining, 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        syncRemaining();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [running]);

  const completeTimer = (targetSec: number) => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    setRunning(false);
    cancelScheduledTimerAlert();
    setRemainingSec(0);
    onTickRef.current?.(0);
    playTimerAlert(alertModeRef.current, soundUriRef.current, soundVolumeRef.current);
    if (alertModeRef.current !== 'silent') {
      setAlertVisible(true);
    }
    onCompleteRef.current?.(targetSec);
  };

  const applyDuration = (seconds: number) => {
    const nextSeconds = Math.max(1, Math.round(seconds));
    setSelectedSec(nextSeconds);
    setCustomParts(nextSeconds);
    targetSecRef.current = nextSeconds;

    if (!running) {
      cancelScheduledTimerAlert();
      runningStartedAtMsRef.current = null;
      completedRef.current = false;
      setRemainingSec(nextSeconds);
      onTickRef.current?.(nextSeconds);
      return;
    }

    const startedAtMs = runningStartedAtMsRef.current ?? Date.now();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    const nextRemainingSec = Math.max(0, nextSeconds - elapsedSec);
    completedRef.current = false;
    setRemainingSec(nextRemainingSec);
    onTickRef.current?.(nextRemainingSec);
    onTargetChangedRef.current?.(nextSeconds);
    cancelScheduledTimerAlert();
    if (nextRemainingSec > 0) {
      void scheduleSystemAlert(nextRemainingSec * 1000);
      return;
    }
    completeTimer(nextSeconds);
  };

  const setCustomParts = (totalSeconds: number) => {
    const normalizedSeconds = Math.max(0, Math.round(totalSeconds));
    setCustomMinutes(String(Math.floor(normalizedSeconds / 60)));
    setCustomSeconds(String(normalizedSeconds % 60).padStart(2, '0'));
  };

  const selectPreset = (seconds: number) => {
    applyDuration(seconds);
  };

  const applyCustom = () => {
    const seconds = getSecondsFromParts(customMinutes, customSeconds);
    if (seconds === null || seconds <= 0) {
      setCustomParts(selectedSec);
      return;
    }
    applyDuration(seconds);
  };

  const stop = () => {
    cancelScheduledTimerAlert();
    setRunning(false);
    onStopRef.current?.(Math.max(0, selectedSec - remainingSec));
  };

  const reset = () => {
    cancelScheduledTimerAlert();
    setRunning(false);
    runningStartedAtMsRef.current = null;
    completedRef.current = false;
    setRemainingSec(selectedSec);
    onTickRef.current?.(selectedSec);
    onResetRef.current?.();
  };

  const start = () => {
    const targetSec = remainingSec === 0 ? selectedSec : remainingSec;
    completedRef.current = false;
    runningStartedAtMsRef.current = Date.now() - (selectedSec - targetSec) * 1000;
    setRemainingSec(targetSec);
    void scheduleSystemAlert(targetSec * 1000);
    setRunning(true);
  };

  const scheduleSystemAlert = async (delayMs: number) => {
    await requestTimerAlertPermission();
    scheduleTimerAlert(delayMs, alertModeRef.current, soundUriRef.current, soundVolumeRef.current);
  };

  return (
    <>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 8,
          borderWidth: 1,
          padding: 10,
          gap: 8,
        }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>Rest</Text>
          <Text
            style={{
              color: remainingSec === 0 ? colors.success : colors.text,
              fontSize: 26,
              fontWeight: '900',
              minWidth: 68,
            }}>
            {formatDuration(remainingSec)}
          </Text>
          {presets.map(seconds => (
            <TimerChip
              active={selectedSec === seconds}
              key={seconds}
              label={formatDuration(seconds)}
              onPress={() => selectPreset(seconds)}
            />
          ))}
          <CustomTimeInput
            active={selectedSec === getSecondsFromParts(customMinutes, customSeconds)}
            minutes={customMinutes}
            onApply={applyCustom}
            onMinutesChange={setCustomMinutes}
            onSecondsChange={setCustomSeconds}
            seconds={customSeconds}
          />
          <IconTimerButton disabled={running} icon={remainingSec === 0 ? 'replay' : 'play-arrow'} onPress={start} />
          <IconTimerButton icon="stop" onPress={stop} secondary />
          <IconTimerButton icon="restart-alt" onPress={reset} secondary />
        </View>
      </View>
      <Modal animationType="fade" transparent visible={alertVisible}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.42)',
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8,
              borderWidth: 1,
              gap: 12,
              padding: 16,
            }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Timer finished</Text>
            <Button
              onPress={() => {
                stopTimerSound();
                setAlertVisible(false);
              }}>
              Stop alert
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface TimerChipProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

const TimerChip = ({ active, label, onPress }: TimerChipProps) => {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 38,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: active ? colors.primary : colors.secondaryBorder,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: active ? colors.primary : colors.secondarySurface,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: 8,
      })}>
      <Text style={{ color: active ? colors.primaryText : colors.secondaryText, fontSize: 13, fontWeight: '900' }}>
        {label}
      </Text>
    </Pressable>
  );
};

interface CustomTimeInputProps {
  active: boolean;
  minutes: string;
  onApply: () => void;
  onMinutesChange: (value: string) => void;
  onSecondsChange: (value: string) => void;
  seconds: string;
}

const CustomTimeInput = ({
  active,
  minutes,
  onApply,
  onMinutesChange,
  onSecondsChange,
  seconds,
}: CustomTimeInputProps) => {
  const colors = useThemeColors();

  return (
    <View
      style={{
        minHeight: 38,
        alignItems: 'center',
        borderColor: active ? colors.primary : colors.secondaryBorder,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        paddingHorizontal: 6,
      }}>
      <TextInput
        keyboardType="numeric"
        onBlur={onApply}
        onChangeText={onMinutesChange}
        onSubmitEditing={onApply}
        style={{
          minWidth: 26,
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
          padding: 0,
          textAlign: 'center',
        }}
        value={minutes}
      />
      <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '900', paddingHorizontal: 2 }}>:</Text>
      <TextInput
        keyboardType="numeric"
        maxLength={2}
        onBlur={onApply}
        onChangeText={onSecondsChange}
        onSubmitEditing={onApply}
        style={{
          minWidth: 26,
          color: colors.text,
          fontSize: 15,
          fontWeight: '800',
          padding: 0,
          textAlign: 'center',
        }}
        value={seconds}
      />
    </View>
  );
};

interface IconTimerButtonProps {
  disabled?: boolean;
  icon: 'play-arrow' | 'replay' | 'restart-alt' | 'stop';
  onPress: () => void;
  secondary?: boolean;
}

const IconTimerButton = ({ disabled = false, icon, onPress, secondary = false }: IconTimerButtonProps) => {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: secondary ? colors.secondaryBorder : colors.primary,
        borderRadius: 8,
        borderWidth: secondary ? 1 : 0,
        backgroundColor: secondary ? colors.secondarySurface : colors.primary,
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
      })}>
      <MaterialIcons color={secondary ? colors.secondaryText : colors.primaryText} name={icon} size={21} />
    </Pressable>
  );
};

const getSecondsFromParts = (minutes: string, seconds: string): number | null => {
  const parsedMinutes = minutes.trim() === '' ? 0 : Number(minutes);
  const parsedSeconds = seconds.trim() === '' ? 0 : Number(seconds);
  if (
    !Number.isFinite(parsedMinutes) ||
    !Number.isFinite(parsedSeconds) ||
    parsedMinutes < 0 ||
    parsedSeconds < 0 ||
    parsedSeconds >= 60
  ) {
    return null;
  }
  return Math.round(parsedMinutes) * 60 + Math.round(parsedSeconds);
};
