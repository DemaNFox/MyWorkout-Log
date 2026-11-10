import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import type { ExerciseHistoryRow } from "../model/types";
import { Card } from "@shared/ui/Card";
import { useThemeColors } from "@shared/ui/theme";

interface ExerciseProgressChartProps {
  rows: ExerciseHistoryRow[];
}

export const ExerciseProgressChart = ({ rows }: ExerciseProgressChartProps) => {
  const colors = useThemeColors();
  const [metric, setMetric] = useState<"weight" | "reps">("weight");
  const visibleRows = rows.slice(-8);
  const values = visibleRows.map((row) =>
    metric === "weight" ? row.bestWeight : row.repsAtBestWeight,
  );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  const points = values.map((value, index) => ({
    x:
      12 +
      (visibleRows.length === 1
        ? 128
        : (index * 256) / (visibleRows.length - 1)),
    y: 127 - ((value - minimum) * 92) / range,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 4,
          gap: 4,
        }}
      >
        {(["weight", "reps"] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: metric === option }}
            onPress={() => setMetric(option)}
            style={{
              flex: 1,
              alignItems: "center",
              minHeight: 38,
              justifyContent: "center",
              borderRadius: 9,
              backgroundColor:
                metric === option ? colors.secondarySurface : colors.surface,
            }}
          >
            <Text
              style={{
                color: metric === option ? colors.primary : colors.muted,
                fontWeight: "800",
              }}
            >
              {option === "weight" ? "Вес" : "Повторения"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
          {metric === "weight" ? "Рабочий вес" : "Повторения"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Последние {visibleRows.length} тренировок ·{" "}
          {metric === "weight" ? "кг" : "раз"}
        </Text>
        <Svg
          width="100%"
          height={156}
          viewBox="0 0 280 156"
          accessibilityLabel={`График: ${values.join(", ")}`}
        >
          <Line
            x1={12}
            x2={268}
            y1={127}
            y2={127}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Line
            x1={12}
            x2={268}
            y1={81}
            y2={81}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Line
            x1={12}
            x2={268}
            y1={35}
            y2={35}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Path
            d={path}
            fill="none"
            stroke={colors.chartWeight}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <Circle
              key={`${visibleRows[index]?.workoutExerciseId}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 5 : 3.5}
              fill={colors.chartWeight}
            />
          ))}
        </Svg>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {visibleRows[0]?.date.slice(0, 10)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {visibleRows[visibleRows.length - 1]?.date.slice(0, 10)}
          </Text>
        </View>
      </Card>
    </>
  );
};
