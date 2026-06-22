import { Text, View } from 'react-native';

import type { ExerciseHistoryRow } from '@entities/analytics/model/types';
import { Card } from '@shared/ui/Card';
import { useThemeColors } from '@shared/ui/theme';

interface ExerciseProgressChartProps {
  rows: ExerciseHistoryRow[];
}

const normalize = (value: number, max: number, maxHeight: number): number =>
  Math.max(10, Math.round((value / max) * maxHeight));

export const ExerciseProgressChart = ({ rows }: ExerciseProgressChartProps) => {
  const colors = useThemeColors();
  const maxWeight = Math.max(...rows.map(row => row.bestWeight), 1);
  const maxReps = Math.max(...rows.map(row => row.repsAtBestWeight), 1);
  const visibleRows = rows.slice(-8);

  return (
    <Card>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Progress chart</Text>

      <Text style={{ color: colors.muted, fontWeight: '700' }}>Working weight</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 132 }}>
        {visibleRows.map(row => (
          <View key={`weight-${row.workoutExerciseId}`} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{row.bestWeight}</Text>
            <View
              style={{
                width: '100%',
                height: normalize(row.bestWeight, maxWeight, 96),
                borderRadius: 6,
                backgroundColor: colors.chartWeight,
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 10 }}>{row.date.slice(5, 10)}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: colors.muted, fontWeight: '700' }}>Reps at working weight</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 112 }}>
        {visibleRows.map(row => (
          <View key={`reps-${row.workoutExerciseId}`} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{row.repsAtBestWeight}</Text>
            <View
              style={{
                width: '100%',
                height: normalize(row.repsAtBestWeight, maxReps, 76),
                borderRadius: 6,
                backgroundColor: colors.chartReps,
              }}
            />
            <Text style={{ color: colors.muted, fontSize: 10 }}>{row.date.slice(5, 10)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
