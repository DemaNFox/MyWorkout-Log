import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import type { ExerciseHistoryRow } from '@entities/analytics/model/types';
import { ExerciseProgressChart } from '@entities/analytics/ui/ExerciseProgressChart';
import { Card } from '@shared/ui/Card';
import { useLayoutMetrics } from '@shared/ui/layout';
import { spacing, useThemeColors } from '@shared/ui/theme';

interface ExerciseInfoModalProps {
  exerciseName: string;
  loading: boolean;
  onClose: () => void;
  rows: ExerciseHistoryRow[];
  visible: boolean;
}

export const ExerciseInfoModal = ({
  exerciseName,
  loading,
  onClose,
  rows,
  visible,
}: ExerciseInfoModalProps) => {
  const colors = useThemeColors();
  const layout = useLayoutMetrics();
  const best = findExtreme(rows, 'best');
  const lowest = findExtreme(rows, 'lowest');

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <ScrollView
        contentContainerStyle={{
          backgroundColor: colors.background,
          flexGrow: 1,
          gap: spacing.lg,
          padding: layout.screenPadding,
          paddingBottom: 48,
        }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <Text style={{ color: colors.text, flex: 1, fontSize: 24, fontWeight: '800' }}>
            {exerciseName}
          </Text>
          <Pressable
            accessibilityLabel="Close exercise information"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: colors.secondaryBorder,
              borderRadius: 22,
              borderWidth: 1,
              height: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
              width: 44,
            })}>
            <MaterialIcons color={colors.secondaryText} name="close" size={24} />
          </Pressable>
        </View>

        {loading ? <Text style={{ color: colors.muted }}>Loading progress…</Text> : null}
        {!loading && rows.length === 0 ? (
          <Card>
            <Text style={{ color: colors.muted }}>
              Complete at least one set to see progress for this exercise.
            </Text>
          </Card>
        ) : null}
        {best && lowest ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Card>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Best working result</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>
                  {best.bestWeight} × {best.repsAtBestWeight}
                </Text>
                <Text style={{ color: colors.muted }}>{formatDate(best.date)}</Text>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>Lowest working result</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>
                  {lowest.bestWeight} × {lowest.repsAtBestWeight}
                </Text>
                <Text style={{ color: colors.muted }}>{formatDate(lowest.date)}</Text>
              </Card>
            </View>
          </View>
        ) : null}
        {rows.length > 0 ? <ExerciseProgressChart rows={rows} /> : null}
        {rows.length > 0 ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Recent history</Text>
            {[...rows].reverse().slice(0, 10).map(row => (
              <View
                key={`${row.workoutSessionId}:${row.workoutExerciseId}`}
                style={{
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 9,
                }}>
                <Text style={{ color: colors.muted }}>{formatDate(row.date)}</Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {row.bestWeight} × {row.repsAtBestWeight}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Modal>
  );
};

const findExtreme = (
  rows: ExerciseHistoryRow[],
  mode: 'best' | 'lowest',
): ExerciseHistoryRow | null =>
  rows.reduce<ExerciseHistoryRow | null>((selected, row) => {
    if (!selected) {
      return row;
    }
    if (mode === 'best') {
      return row.bestWeight > selected.bestWeight ||
        (row.bestWeight === selected.bestWeight && row.repsAtBestWeight > selected.repsAtBestWeight)
        ? row
        : selected;
    }
    return row.bestWeight < selected.bestWeight ||
      (row.bestWeight === selected.bestWeight && row.repsAtBestWeight < selected.repsAtBestWeight)
      ? row
      : selected;
  }, null);

const formatDate = (value: string): string => value.slice(0, 10) || 'Unknown date';
