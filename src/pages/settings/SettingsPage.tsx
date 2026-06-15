import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { useDatabase } from '@app/providers/DatabaseProvider';
import type { ThemeMode } from '@shared/ui/theme';
import { useThemeColors, useThemeMode } from '@shared/ui/theme';
import { ExportService } from '@features/export-data/model/exportService';
import { ImportService } from '@features/import-data/model/importService';
import type { TimerAlertMode, UserSettings } from '@entities/settings/model/types';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Screen } from '@shared/ui/Screen';
import { TextField } from '@shared/ui/TextField';

export const SettingsPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const theme = useThemeMode();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');

  useEffect(() => {
    void new SettingsRepository(db).get().then(setSettings);
  }, [db]);

  const updateSettings = async (patch: Partial<Pick<UserSettings, 'themeMode' | 'timerAlert'>>) => {
    const repository = new SettingsRepository(db);
    const current = await repository.get();
    const next = { ...current, ...patch };
    await repository.update(next);
    setSettings(next);
    if (patch.themeMode) {
      await theme.setMode(patch.themeMode);
    }
  };

  const backup = async () => {
    setExportText(JSON.stringify(await new ExportService(db).createBackup(), null, 2));
  };

  const importJson = async () => {
    try {
      const id = await new ImportService(db).importJson(importText);
      Alert.alert('Import complete', `Imported: ${id}`);
      setImportText('');
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const themeButtons = (['light', 'dark'] as const).map((mode: ThemeMode) => (
    <View key={mode} style={{ flex: 1 }}>
      <Button onPress={() => void updateSettings({ themeMode: mode })} variant={settings?.themeMode === mode ? 'primary' : 'secondary'}>
        {mode === 'light' ? 'Light' : 'Dark'}
      </Button>
    </View>
  ));

  const alertButtons = (['vibrate', 'silent'] as const).map((mode: TimerAlertMode) => (
    <View key={mode} style={{ flex: 1 }}>
      <Button onPress={() => void updateSettings({ timerAlert: mode })} variant={settings?.timerAlert === mode ? 'primary' : 'secondary'}>
        {mode === 'vibrate' ? 'Vibrate' : 'Silent'}
      </Button>
    </View>
  ));

  return (
    <Screen title="Settings">
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Defaults</Text>
        <Text style={{ color: colors.muted }}>
          Unit: {settings?.weightUnit ?? 'kg'} - Rest: {settings?.defaultRestSec ?? 90}s
        </Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Theme</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>{themeButtons}</View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Timer alert</Text>
        <Text style={{ color: colors.muted }}>
          Vibrate plays a short device vibration when the rest timer reaches zero.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>{alertButtons}</View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Import JSON</Text>
        <TextField label="JSON" onChangeText={setImportText} value={importText} />
        <Button disabled={!importText.trim()} onPress={importJson}>Import</Button>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Backup</Text>
        <Button onPress={backup}>Create backup JSON</Button>
        {exportText ? <Text selectable style={{ color: colors.text, fontSize: 12 }}>{exportText}</Text> : null}
      </Card>
    </Screen>
  );
};
