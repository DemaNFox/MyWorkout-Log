import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import type { ExerciseHistoryRow } from "../model/types";
import { Card } from "@shared/ui/Card";
import { useThemeColors } from "@shared/ui/theme";

interface ExerciseProgressChartProps {
  rows: ExerciseHistoryRow[];
}

const chart = {
  width: 300,
  left: 39,
  right: 286,
  top: 58,
  middle: 106,
  bottom: 154,
};

const formatValue = (value: number): string =>
  (Number.isInteger(value) ? String(value) : value.toFixed(1)).replace(
    ".",
    ",",
  );

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}.${month}.${year}` : iso;
};

const shortDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCFullYear()).slice(-2)}`;
};

export const ExerciseProgressChart = ({ rows }: ExerciseProgressChartProps) => {
  const colors = useThemeColors();
  const [metric, setMetric] = useState<"weight" | "reps">("weight");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visibleRows = rows.slice(-8);

  if (visibleRows.length === 0) {
    return null;
  }

  const values = visibleRows.map((row) =>
    metric === "weight" ? row.bestWeight : row.repsAtBestWeight,
  );
  const timestamps = visibleRows.map((row, index) => {
    const parsed = Date.parse(row.date);
    return Number.isFinite(parsed) ? parsed : index;
  });
  const firstTime = Math.min(...timestamps);
  const lastTime = Math.max(...timestamps);
  const timeSpan = lastTime - firstTime;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const points = values.map((value, index) => ({
    x:
      chart.left +
      (timeSpan > 0
        ? (timestamps[index]! - firstTime) / timeSpan
        : visibleRows.length === 1
          ? 0.5
          : index / (visibleRows.length - 1)) *
        (chart.right - chart.left),
    y:
      range > 0
        ? chart.bottom -
          ((value - minimum) / range) * (chart.bottom - chart.top)
        : chart.middle,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const selectedIndex = visibleRows.findIndex(
    (row) => `${row.workoutSessionId}:${row.workoutExerciseId}` === selectedId,
  );
  const activeIndex =
    selectedIndex >= 0 ? selectedIndex : visibleRows.length - 1;
  const selected = visibleRows[activeIndex]!;
  const selectedPoint = points[activeIndex]!;
  const unit = metric === "weight" ? "кг" : "повт.";
  const bubbleX = Math.max(
    chart.left,
    Math.min(chart.right - 102, selectedPoint.x - 51),
  );

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
              minHeight: 44,
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
          Последние {visibleRows.length} тренировок · нажми на точку
        </Text>
        <Svg
          width="100%"
          height={205}
          viewBox={`0 0 ${chart.width} 205`}
          accessibilityLabel={`График ${metric === "weight" ? "веса" : "повторений"}. Выбрано ${formatDate(selected.date)}: ${formatValue(values[activeIndex]!)} ${unit}`}
        >
          {[chart.top, chart.middle, chart.bottom].map((y) => (
            <Line
              key={y}
              x1={chart.left}
              x2={chart.right}
              y1={y}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {range > 0 ? (
            [maximum, (maximum + minimum) / 2, minimum].map((value, index) => (
              <SvgText
                key={index}
                x={chart.left - 6}
                y={[chart.top, chart.middle, chart.bottom][index]! + 4}
                textAnchor="end"
                fill={colors.muted}
                fontSize={10}
              >
                {formatValue(value)}
              </SvgText>
            ))
          ) : (
            <SvgText
              x={chart.left - 6}
              y={chart.middle + 4}
              textAnchor="end"
              fill={colors.muted}
              fontSize={10}
            >
              {formatValue(minimum)}
            </SvgText>
          )}
          <Line
            x1={selectedPoint.x}
            x2={selectedPoint.x}
            y1={chart.top}
            y2={chart.bottom}
            stroke={colors.primary}
            strokeOpacity={0.55}
            strokeDasharray="4 4"
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
              r={index === activeIndex ? 6 : 4}
              fill={colors.chartWeight}
              stroke={index === activeIndex ? colors.surface : "none"}
              strokeWidth={2}
            />
          ))}
          <Rect
            x={bubbleX}
            y={4}
            width={102}
            height={40}
            rx={10}
            fill={colors.secondarySurface}
          />
          <SvgText
            x={bubbleX + 51}
            y={19}
            textAnchor="middle"
            fill={colors.secondaryText}
            fontSize={10}
          >
            {formatDate(selected.date)}
          </SvgText>
          <SvgText
            x={bubbleX + 51}
            y={35}
            textAnchor="middle"
            fill={colors.text}
            fontSize={13}
            fontWeight="bold"
          >
            {formatValue(values[activeIndex]!)} {unit}
          </SvgText>
          {timeSpan > 0 ? (
            [0, 0.5, 1].map((fraction, index) => (
              <SvgText
                key={fraction}
                x={chart.left + fraction * (chart.right - chart.left)}
                y={184}
                textAnchor={
                  index === 0 ? "start" : index === 2 ? "end" : "middle"
                }
                fill={colors.muted}
                fontSize={11}
              >
                {shortDate(firstTime + fraction * timeSpan)}
              </SvgText>
            ))
          ) : (
            <SvgText x={chart.left} y={184} fill={colors.muted} fontSize={11}>
              {formatDate(selected.date)}
            </SvgText>
          )}
          {points.map((point, index) => {
            const left =
              index === 0 ? chart.left : (points[index - 1]!.x + point.x) / 2;
            const right =
              index === points.length - 1
                ? chart.right
                : (point.x + points[index + 1]!.x) / 2;
            const row = visibleRows[index]!;
            return (
              <Rect
                key={`touch-${row.workoutExerciseId}-${index}`}
                testID={`chart-point-${index}`}
                accessibilityLabel={`${formatDate(row.date)}: ${formatValue(values[index]!)} ${unit}`}
                x={left}
                y={chart.top - 10}
                width={Math.max(1, right - left)}
                height={chart.bottom - chart.top + 20}
                fill="transparent"
                onPress={() =>
                  setSelectedId(
                    `${row.workoutSessionId}:${row.workoutExerciseId}`,
                  )
                }
              />
            );
          })}
        </Svg>
      </Card>
    </>
  );
};
