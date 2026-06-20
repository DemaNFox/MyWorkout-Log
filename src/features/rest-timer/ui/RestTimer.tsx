import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Text, View } from 'react-native';

import { useDatabase } from '@app/providers/DatabaseProvider';
import type { TimerAlertMode } from '@entities/settings/model/types';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { formatDuration } from '@shared/lib/date';
import { cancelScheduledTimerAlert, playTimerAlert, scheduleTimerAlert, stopTimerSound } from '@shared/lib/timerAlert';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { useThemeColors } from '@shared/ui/theme';

const presets = [60, 90, 120] as const;

interface RestTimerProps {
  autoStartKey?: number;
  onComplete?: (elapsedSec: number) => void;
  onReset?: () => void;
  onStarted?: (targetSec: number) => void;
  onStop?: (elapsedSec: number) => void;
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
  onTick,
  resumeStartedAt = null,
  resumeTargetSec = null,
}: RestTimerProps) => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [selectedSec, setSelectedSec] = useState<number>(90);
  const [remainingSec, setRemainingSec] = useState<number>(90);
  const [running, setRunning] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMode, setAlertMode] = useState<TimerAlertMode>('vibrate');
  const [soundUri, setSoundUri] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState(1);
  const onCompleteRef = useRef(onComplete);
  const onResetRef = useRef(onReset);
  const onStartedRef = useRef(onStarted);
  const onStopRef = useRef(onStop);
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
    onTickRef.current = onTick;
  }, [onComplete, onReset, onStarted, onStop, onTick]);

  useEffect(() => {
    alertModeRef.current = alertMode;
    soundUriRef.current = soundUri;
    soundVolumeRef.current = soundVolume;
    targetSecRef.current = selectedSec;
  }, [alertMode, selectedSec, soundUri, soundVolume]);

  useEffect(() => {
    void new SettingsRepository(db).get().then(settings => {
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
    scheduleTimerAlert(selectedSec * 1000, alertModeRef.current, soundUriRef.current, soundVolumeRef.current);
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
    setRemainingSec(nextRemainingSec);
    onTickRef.current?.(nextRemainingSec);
    if (nextRemainingSec > 0) {
      scheduleTimerAlert(nextRemainingSec * 1000, alertModeRef.current, soundUriRef.current, soundVolumeRef.current);
      setRunning(true);
      return;
    }
    setRunning(false);
    cancelScheduledTimerAlert();
    onCompleteRef.current?.(resumeTargetSec);
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
      completedRef.current = true;
      setRunning(false);
      cancelScheduledTimerAlert();
      playTimerAlert(alertModeRef.current, soundUriRef.current, soundVolumeRef.current);
      if (alertModeRef.current !== 'silent') {
        setAlertVisible(true);
      }
      onCompleteRef.current?.(targetSec);
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

  const selectPreset = (seconds: number) => {
    cancelScheduledTimerAlert();
    runningStartedAtMsRef.current = null;
    completedRef.current = false;
    setSelectedSec(seconds);
    setRemainingSec(seconds);
    setRunning(false);
  };

  const start = () => {
    const targetSec = remainingSec === 0 ? selectedSec : remainingSec;
    completedRef.current = false;
    runningStartedAtMsRef.current = Date.now() - (selectedSec - targetSec) * 1000;
    setRemainingSec(targetSec);
    scheduleTimerAlert(targetSec * 1000, alertModeRef.current, soundUriRef.current, soundVolumeRef.current);
    setRunning(true);
  };

  return (
    <>
      <Card>
        <Text style={{ color: colors.muted, fontWeight: '700' }}>Rest</Text>
        <Text style={{ color: remainingSec === 0 ? colors.success : colors.text, fontSize: 32, fontWeight: '900' }}>
          {formatDuration(remainingSec)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {presets.map(seconds => (
            <View key={seconds} style={{ flex: 1 }}>
              <Button onPress={() => selectPreset(seconds)} variant={selectedSec === seconds ? 'primary' : 'secondary'}>
                {seconds}s
              </Button>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button disabled={running} onPress={start}>{remainingSec === 0 ? 'Restart' : 'Start'}</Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              onPress={() => {
                cancelScheduledTimerAlert();
                setRunning(false);
                onStopRef.current?.(Math.max(0, selectedSec - remainingSec));
              }}
              variant="secondary">
              Stop
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              onPress={() => {
                cancelScheduledTimerAlert();
                setRunning(false);
                runningStartedAtMsRef.current = null;
                completedRef.current = false;
                setRemainingSec(selectedSec);
                onTickRef.current?.(selectedSec);
                onResetRef.current?.();
              }}
              variant="secondary">
              Reset
            </Button>
          </View>
        </View>
      </Card>
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
