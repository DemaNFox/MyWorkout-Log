import { useEffect, useState } from 'react';
import { Text, Vibration, View } from 'react-native';

import { useDatabase } from '@app/providers/DatabaseProvider';
import type { TimerAlertMode } from '@entities/settings/model/types';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { formatDuration } from '@shared/lib/date';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { useThemeColors } from '@shared/ui/theme';

const presets = [60, 90, 120] as const;

export const RestTimer = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const [selectedSec, setSelectedSec] = useState<number>(90);
  const [remainingSec, setRemainingSec] = useState<number>(90);
  const [running, setRunning] = useState(false);
  const [alertMode, setAlertMode] = useState<TimerAlertMode>('vibrate');

  useEffect(() => {
    void new SettingsRepository(db).get().then(settings => setAlertMode(settings.timerAlert));
  }, [db]);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      setRemainingSec(current => {
        if (current <= 1) {
          setRunning(false);
          if (alertMode === 'vibrate') {
            Vibration.vibrate([0, 250, 150, 250]);
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [alertMode, running]);

  const selectPreset = (seconds: number) => {
    setSelectedSec(seconds);
    setRemainingSec(seconds);
    setRunning(false);
  };

  const start = () => {
    if (remainingSec === 0) {
      setRemainingSec(selectedSec);
    }
    setRunning(true);
  };

  return (
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
          <Button onPress={() => setRunning(false)} variant="secondary">Stop</Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            onPress={() => {
              setRunning(false);
              setRemainingSec(selectedSec);
            }}
            variant="secondary">
            Reset
          </Button>
        </View>
      </View>
    </Card>
  );
};
