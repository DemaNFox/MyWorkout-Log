import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Slider from '@react-native-community/slider';

import { useDatabase } from '@app/providers/DatabaseProvider';
import type { ThemeMode } from '@shared/ui/theme';
import { useThemeColors, useThemeMode } from '@shared/ui/theme';
import { ExportService } from '@features/export-data/model/exportService';
import { shareJsonExportFile } from '@features/export-data/model/shareJsonExportFile';
import { ImportService } from '@features/import-data/model/importService';
import type { Plan } from '@entities/plan/model/types';
import { PlanRepository } from '@entities/plan/repository/planRepository';
import type { TimerAlertMode, UserSettings } from '@entities/settings/model/types';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { pickTimerSound } from '@shared/lib/timerAlert';
import { Screen } from '@shared/ui/Screen';
import { TextField } from '@shared/ui/TextField';
import {
  OperationStatusModal,
  type OperationStatus,
} from '@shared/ui/OperationStatusModal';
import { AppError } from '@shared/lib/errors';

type ExportPickerMode = 'programs' | 'history';
type OperationFeedback = {
  status: OperationStatus;
  title: string;
  message: string;
};
const timerAlertModes = ['sound-vibrate', 'sound', 'vibrate', 'silent'] as const;

export const SettingsPage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const theme = useThemeMode();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [exportPickerVisible, setExportPickerVisible] = useState(false);
  const [exportPickerMode, setExportPickerMode] = useState<ExportPickerMode>('history');
  const [timerAlertPickerVisible, setTimerAlertPickerVisible] = useState(false);
  const [restPresetFields, setRestPresetFields] = useState(['60', '90', '120']);
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [exportFileName, setExportFileName] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedback | null>(null);
  const [expandedSection, setExpandedSection] = useState<'training' | 'appearance' | 'data' | null>(null);

  useEffect(() => {
    void new SettingsRepository(db).get().then(nextSettings => {
      setSettings(nextSettings);
      setRestPresetFields([
        String(nextSettings.restPreset1Sec),
        String(nextSettings.restPreset2Sec),
        String(nextSettings.restPreset3Sec),
      ]);
    });
    void new PlanRepository(db).list().then(nextPlans => {
      setPlans(nextPlans);
      setSelectedPlanIds(nextPlans.filter(plan => plan.status === 'active').map(plan => plan.id));
    });
  }, [db]);

  const updateSettings = async (
    patch: Partial<
      Pick<
        UserSettings,
        | 'defaultRestSec'
        | 'themeMode'
        | 'timerAlert'
        | 'timerSoundUri'
        | 'timerSoundTitle'
        | 'timerSoundVolume'
        | 'restPreset1Sec'
        | 'restPreset2Sec'
        | 'restPreset3Sec'
      >
    >,
  ) => {
    const repository = new SettingsRepository(db);
    const current = await repository.get();
    const next = { ...current, ...patch };
    await repository.update(next);
    setSettings(next);
    if (patch.themeMode) {
      await theme.setMode(patch.themeMode);
    }
  };

  const chooseTimerSound = async () => {
    try {
      const sound = await pickTimerSound();
      if (!sound.uri) {
        return;
      }
      await updateSettings({ timerSoundUri: sound.uri, timerSoundTitle: sound.title ?? 'Timer sound' });
    } catch (error) {
      Alert.alert('Cannot select sound', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const updateTimerVolume = async (volume: number) => {
    await updateSettings({ timerSoundVolume: Math.min(1, Math.max(0, volume)) });
  };

  const saveRestPresets = async () => {
    const values = restPresetFields.map(value => Number(value));
    if (values.some(value => !Number.isFinite(value) || value <= 0)) {
      Alert.alert('Cannot save rest presets', 'Preset values must be positive seconds.');
      return;
    }
    const roundedValues = values.map(value => Math.round(value));
    const first = roundedValues[0] ?? 60;
    const second = roundedValues[1] ?? 90;
    const third = roundedValues[2] ?? 120;
    await updateSettings({
      defaultRestSec: second,
      restPreset1Sec: first,
      restPreset2Sec: second,
      restPreset3Sec: third,
    });
  };

  const backup = async () => {
    setOperationFeedback({
      status: 'loading',
      title: 'Creating backup',
      message: 'Collecting your local workout data…',
    });
    try {
      setExportText(JSON.stringify(await new ExportService(db).createBackup(), null, 2));
      setExportFileName(null);
      setOperationFeedback({
        status: 'success',
        title: 'Backup created',
        message: 'The backup JSON is ready below.',
      });
    } catch (error) {
      showOperationError('Backup failed', getExportErrorMessage(error));
    }
  };

  const shareExport = async (input: {
    contents: string;
    fileNamePrefix: string;
    dialogTitle: string;
  }) => {
    const sharedFile = await shareJsonExportFile(input);
    setExportText(input.contents);
    setExportFileName(sharedFile.fileName);
    setExportPickerVisible(false);
    return sharedFile;
  };

  const exportPrograms = async (planIds: string[]) => {
    setExportPickerVisible(false);
    setOperationFeedback({
      status: 'loading',
      title: 'Exporting programs',
      message: 'Preparing the JSON file…',
    });
    try {
      const exported = await new ExportService(db).exportPrograms(planIds);
      const file = await shareExport({
        contents: JSON.stringify(exported, null, 2),
        fileNamePrefix: 'workout-logger-programs',
        dialogTitle: 'Share programs JSON',
      });
      setOperationFeedback({
        status: 'success',
        title: 'Programs exported',
        message: `File created: ${file.fileName}`,
      });
    } catch (error) {
      showOperationError('Export failed', getExportErrorMessage(error));
    }
  };

  const exportProgramHistory = async (planIds: string[]) => {
    setExportPickerVisible(false);
    setOperationFeedback({
      status: 'loading',
      title: 'Exporting history',
      message: 'Preparing workout history and progress data…',
    });
    try {
      const exported = await new ExportService(db).exportProgramHistory(planIds);
      const file = await shareExport({
        contents: JSON.stringify(exported, null, 2),
        fileNamePrefix: 'workout-logger-program-history',
        dialogTitle: 'Share program history JSON',
      });
      setOperationFeedback({
        status: 'success',
        title: 'History exported',
        message: `File created: ${file.fileName}`,
      });
    } catch (error) {
      showOperationError('Export failed', getExportErrorMessage(error));
    }
  };

  const exportExerciseComments = async () => {
    setOperationFeedback({
      status: 'loading',
      title: 'Exporting comments',
      message: 'Preparing the exercise comment log…',
    });
    try {
      const exported = await new ExportService(db).exportExerciseComments();
      const file = await shareExport({
        contents: JSON.stringify(exported, null, 2),
        fileNamePrefix: 'workout-logger-exercise-comments',
        dialogTitle: 'Share exercise comments JSON',
      });
      setOperationFeedback({
        status: 'success',
        title: 'Comments exported',
        message: `File created: ${file.fileName}`,
      });
    } catch (error) {
      showOperationError('Export failed', getExportErrorMessage(error));
    }
  };

  const openExportPicker = async (mode: ExportPickerMode) => {
    const nextPlans = await new PlanRepository(db).list();
    setPlans(nextPlans);
    setExportPickerMode(mode);
    setSelectedPlanIds(current =>
      current.length > 0 ? current : nextPlans.filter(plan => plan.status === 'active').map(plan => plan.id),
    );
    setExportPickerVisible(true);
  };

  const toggleSelectedPlan = (planId: string) => {
    setSelectedPlanIds(current =>
      current.includes(planId) ? current.filter(id => id !== planId) : [...current, planId],
    );
  };

  const importJson = async () => {
    await runImport(importText);
  };

  const importJsonFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: 'application/json',
      });
      if (result.canceled) {
        return;
      }
      const file = result.assets[0];
      if (!file) {
        throw new Error('No file selected');
      }
      setOperationFeedback({
        status: 'loading',
        title: 'Reading import file',
        message: 'Loading the selected JSON file…',
      });
      const raw = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      await runImport(raw);
    } catch (error) {
      showOperationError('Import failed', getImportErrorMessage(error));
    }
  };

  const runImport = async (raw: string) => {
    setOperationFeedback({
      status: 'loading',
      title: 'Importing programs',
      message: 'Validating the file and saving programs…',
    });
    try {
      const result = await new ImportService(db).importJson(raw);
      const nextPlans = await new PlanRepository(db).list();
      setPlans(nextPlans);
      setImportText('');
      setOperationFeedback({
        status: 'success',
        title: 'Import complete',
        message:
          result.importedCommentCount === undefined
            ? formatImportedPrograms(result.importedPlanIds.length)
            : `${result.importedCommentCount} comment entries imported successfully.`,
      });
    } catch (error) {
      showOperationError('Import failed', getImportErrorMessage(error));
    }
  };

  const showOperationError = (title: string, message: string) => {
    setOperationFeedback({ status: 'error', title, message });
  };

  const themeButtons = (['light', 'dark'] as const).map((mode: ThemeMode) => (
    <View key={mode} style={{ flex: 1 }}>
      <Button onPress={() => void updateSettings({ themeMode: mode })} variant={settings?.themeMode === mode ? 'primary' : 'secondary'}>
        {mode === 'light' ? 'Light' : 'Dark'}
      </Button>
    </View>
  ));

  return (
    <Screen title="Настройки" eyebrow="Приложение" subtitle="Всё для комфортной тренировки.">
      <Pressable accessibilityRole="button" onPress={() => setExpandedSection(current => current === 'training' ? null : 'training')}><Card><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Тренировка  {expandedSection === 'training' ? '⌃' : '⌄'}</Text><Text style={{ color: colors.muted }}>Отдых, звук и уведомления</Text></Card></Pressable>
      {expandedSection === 'training' ? <>
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Отдых</Text>
        <Text style={{ color: colors.muted }}>
          Unit: {settings?.weightUnit ?? 'kg'} - Rest: {settings?.defaultRestSec ?? 90}s
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {restPresetFields.map((value, index) => (
            <View key={`rest-preset-${index}`} style={{ flex: 1 }}>
              <TextField
                keyboardType="numeric"
                label={`Rest ${index + 1}`}
                onChangeText={nextValue =>
                  setRestPresetFields(current => current.map((item, itemIndex) => (itemIndex === index ? nextValue : item)))
                }
                value={value}
              />
            </View>
          ))}
        </View>
        <Button onPress={() => void saveRestPresets()} variant="secondary">
          Сохранить интервалы отдыха
        </Button>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Оповещение таймера</Text>
        <Text style={{ color: colors.muted }}>
          Sound uses the selected system alarm tone when the rest timer reaches zero.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTimerAlertPickerVisible(true)}
          style={({ pressed }) => ({
            minHeight: 48,
            justifyContent: 'center',
            borderColor: colors.secondaryBorder,
            borderRadius: 8,
            borderWidth: 1,
            opacity: pressed ? 0.82 : 1,
            paddingHorizontal: 12,
          })}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
            {getTimerAlertLabel(settings?.timerAlert ?? 'vibrate')}
          </Text>
        </Pressable>
        <Button onPress={() => void chooseTimerSound()} variant="secondary">
          Sound: {settings?.timerSoundTitle ?? 'System alarm'}
        </Button>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>
            Sound volume: {Math.round((settings?.timerSoundVolume ?? 1) * 100)}%
          </Text>
          <Slider
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.secondaryBorder}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            thumbTintColor={colors.primary}
            value={settings?.timerSoundVolume ?? 1}
            onValueChange={value =>
              setSettings(current => (current ? { ...current, timerSoundVolume: value } : current))
            }
            onSlidingComplete={value => void updateTimerVolume(value)}
          />
        </View>
      </Card>
      </> : null}

      <Pressable accessibilityRole="button" onPress={() => setExpandedSection(current => current === 'appearance' ? null : 'appearance')}><Card><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Внешний вид  {expandedSection === 'appearance' ? '⌃' : '⌄'}</Text><Text style={{ color: colors.muted }}>Тема: {settings?.themeMode === 'dark' ? 'тёмная' : 'светлая'}</Text></Card></Pressable>
      {expandedSection === 'appearance' ? <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Тема</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>{themeButtons}</View>
      </Card> : null}

      <Pressable accessibilityRole="button" onPress={() => setExpandedSection(current => current === 'data' ? null : 'data')}><Card><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Данные  {expandedSection === 'data' ? '⌃' : '⌄'}</Text><Text style={{ color: colors.muted }}>Импорт, экспорт и резервная копия</Text></Card></Pressable>
      {expandedSection === 'data' ? <>
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Импорт JSON</Text>
        <Button onPress={() => void importJsonFile()}>Выбрать файл JSON</Button>
        <TextField label="JSON" onChangeText={setImportText} value={importText} />
        <Button disabled={!importText.trim()} onPress={importJson}>Импортировать</Button>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Экспорт</Text>
        <Button onPress={() => void openExportPicker('programs')}>Экспорт программ</Button>
        <Button onPress={() => void openExportPicker('history')}>Экспорт истории</Button>
        <Button onPress={() => void exportExerciseComments()}>Экспорт комментариев</Button>
        <Button onPress={backup}>Создать резервную копию</Button>
        {exportFileName ? <Text style={{ color: colors.muted }}>Saved file: {exportFileName}</Text> : null}
        {exportText ? <Text selectable style={{ color: colors.text, fontSize: 12 }}>{exportText}</Text> : null}
      </Card>
      </> : null}

      <Modal animationType="fade" transparent visible={exportPickerVisible}>
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
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              {exportPickerMode === 'programs' ? 'Choose programs to export' : 'Choose programs for history'}
            </Text>
            {plans.length === 0 ? (
              <Text style={{ color: colors.muted }}>Create a program before exporting history.</Text>
            ) : null}
            <View style={{ gap: 8 }}>
              {plans.map(plan => {
                const selected = selectedPlanIds.includes(plan.id);

                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    key={plan.id}
                    onPress={() => toggleSelectedPlan(plan.id)}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      alignItems: 'center',
                      borderColor: selected ? colors.primary : colors.secondaryBorder,
                      borderRadius: 8,
                      borderWidth: 1,
                      flexDirection: 'row',
                      gap: 10,
                      opacity: pressed ? 0.82 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    })}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: selected ? colors.primary : colors.secondaryBorder,
                        borderRadius: 4,
                        borderWidth: 2,
                        backgroundColor: selected ? colors.primary : colors.surface,
                      }}>
                      {selected ? <Text style={{ color: colors.primaryText, fontWeight: '900' }}>X</Text> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{plan.name}</Text>
                      <Text style={{ color: colors.muted }}>{plan.status}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button onPress={() => setExportPickerVisible(false)} variant="secondary">
                  Cancel
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  disabled={selectedPlanIds.length === 0}
                  onPress={() =>
                    void (exportPickerMode === 'programs'
                      ? exportPrograms(selectedPlanIds)
                      : exportProgramHistory(selectedPlanIds))
                  }>
                  Export
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="fade" transparent visible={timerAlertPickerVisible}>
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
              gap: 8,
              padding: 16,
            }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Timer alert</Text>
            {timerAlertModes.map(mode => (
              <Pressable
                accessibilityRole="button"
                key={mode}
                onPress={() => {
                  void updateSettings({ timerAlert: mode });
                  setTimerAlertPickerVisible(false);
                }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  justifyContent: 'center',
                  borderColor: settings?.timerAlert === mode ? colors.primary : colors.secondaryBorder,
                  borderRadius: 8,
                  borderWidth: 1,
                  opacity: pressed ? 0.82 : 1,
                  paddingHorizontal: 12,
                })}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                  {getTimerAlertLabel(mode)}
                </Text>
              </Pressable>
            ))}
            <Button onPress={() => setTimerAlertPickerVisible(false)} variant="secondary">
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
      <OperationStatusModal
        message={operationFeedback?.message ?? ''}
        onClose={() => setOperationFeedback(null)}
        status={operationFeedback?.status ?? 'loading'}
        title={operationFeedback?.title ?? ''}
        visible={operationFeedback !== null}
      />
    </Screen>
  );
};

const formatImportedPrograms = (count: number): string =>
  count === 1 ? '1 program was imported successfully.' : `${count} programs were imported successfully.`;

const getImportErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    if (error.code === 'import.exerciseMissingMetadata') {
      return `${error.message}. No data was changed.`;
    }
    if (error.code === 'import.invalidJson') {
      return 'The selected file is not valid JSON. No data was changed.';
    }
    if (error.code === 'import.unsupportedVersion') {
      return 'This import format version is not supported. No data was changed.';
    }
    if (error.code === 'import.invalidShape' || error.code === 'import.invalidPayload') {
      return 'The file does not match the Workout Logger import format. No data was changed.';
    }
  }
  return 'The file could not be imported. No data was changed. Check the file and try again.';
};

const getExportErrorMessage = (error: unknown): string => {
  if (error instanceof AppError && error.code === 'export.sharingUnavailable') {
    return 'The file was created, but the Android sharing window is unavailable.';
  }
  if (error instanceof AppError && error.code === 'export.fileStorageUnavailable') {
    return 'File storage is unavailable on this device.';
  }
  return 'The file could not be created or shared. Please try again.';
};

const getTimerAlertLabel = (mode: TimerAlertMode): string => {
  if (mode === 'sound-vibrate') {
    return 'Sound + vibrate';
  }
  if (mode === 'sound') {
    return 'Sound';
  }
  if (mode === 'vibrate') {
    return 'Vibrate';
  }
  return 'Silent';
};
