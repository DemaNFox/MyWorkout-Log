import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@app/navigation/types";
import { useDatabase } from "@app/providers/DatabaseProvider";
import type { Plan } from "@entities/plan/model/types";
import { PlanRepository } from "@entities/plan/repository/planRepository";
import type { TrainingDay } from "@entities/training-day/model/types";
import { TrainingDayRepository } from "@entities/training-day/repository/trainingDayRepository";
import type { WorkoutSession } from "@entities/workout/model/types";
import { WorkoutRepository } from "@entities/workout/repository/workoutRepository";
import { StartWorkoutService } from "@features/workout-start/model/startWorkoutService";
import { formatDuration } from "@shared/lib/date";
import { Card } from "@shared/ui/Card";
import { EmptyState } from "@shared/ui/EmptyState";
import { Screen } from "@shared/ui/Screen";
import { spacing, useThemeColors } from "@shared/ui/theme";

export const HomePage = () => {
  const db = useDatabase();
  const colors = useThemeColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(
    null,
  );
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([]);

  const load = useCallback(async () => {
    const workoutRepository = new WorkoutRepository(db);
    const plan = await new PlanRepository(db).getActive();
    setActivePlan(plan);
    setTrainingDays(
      plan ? await new TrainingDayRepository(db).listDays(plan.id) : [],
    );
    setActiveWorkout(await workoutRepository.getOpenSessionForActivePlan());
    setRecentWorkouts(
      (await workoutRepository.listSessionsForActivePlan(10))
        .filter((session) => session.finishedAt)
        .slice(0, 2),
    );
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openWorkout = async (dayId: string) => {
    try {
      const openSession = await new WorkoutRepository(
        db,
      ).getOpenSessionForActivePlan();
      const session =
        openSession ??
        (await new StartWorkoutService(db).startFromActivePlan(dayId));
      navigation.navigate("WorkoutSession", { workoutId: session.id });
    } catch (error) {
      Alert.alert(
        "Не удалось начать тренировку",
        error instanceof Error ? error.message : "Неизвестная ошибка",
      );
    }
  };

  const primaryDay = trainingDays[0];

  return (
    <Screen
      title="Хорошая тренировка начинается здесь."
      eyebrow="Сегодня"
      subtitle={
        activePlan
          ? `Программа «${activePlan.name}»`
          : "Планируй, тренируйся и следи за прогрессом."
      }
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: spacing.sm,
        }}
      >
        <Pressable
          accessibilityLabel="Упражнения"
          accessibilityRole="button"
          onPress={() => navigation.navigate("Exercises")}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Ionicons name="barbell-outline" color={colors.primary} size={20} />
        </Pressable>
        <Pressable
          accessibilityLabel="Настройки"
          accessibilityRole="button"
          onPress={() => navigation.navigate("Settings")}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Ionicons name="settings-outline" color={colors.primary} size={20} />
        </Pressable>
      </View>
      <View
        style={{
          backgroundColor: colors.primary,
          borderRadius: 20,
          padding: 20,
          gap: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.primaryText,
            opacity: 0.8,
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 1.3,
          }}
        >
          {activeWorkout ? "ТРЕНИРОВКА В ПРОЦЕССЕ" : "АКТИВНАЯ ПРОГРАММА"}
        </Text>
        <Text
          style={{ color: colors.primaryText, fontSize: 24, fontWeight: "800" }}
        >
          {activeWorkout?.trainingDayNameSnapshot ??
            primaryDay?.name ??
            activePlan?.name ??
            "Начни с программы"}
        </Text>
        <Text style={{ color: colors.primaryText, opacity: 0.8 }}>
          {activePlan?.name ?? "Создай первую программу, чтобы начать"}
        </Text>
        {activeWorkout ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("WorkoutSession", {
                workoutId: activeWorkout.id,
              })
            }
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.secondaryText, fontWeight: "800" }}>
              Продолжить тренировку
            </Text>
          </Pressable>
        ) : primaryDay ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void openWorkout(primaryDay.id)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.secondaryText, fontWeight: "800" }}>
              Начать тренировку
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: colors.primaryText }}>
            {activePlan
              ? "Добавь тренировочный день в программу."
              : "Создай программу на вкладке «Программы»."}
          </Text>
        )}
      </View>
      {!activeWorkout && trainingDays.length > 1 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
            Другие дни
          </Text>
          {trainingDays.slice(1).map((day) => (
            <Pressable
              key={day.id}
              accessibilityRole="button"
              onPress={() => void openWorkout(day.id)}
            >
              <Card>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {day.name}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
        Последние тренировки
      </Text>
      {recentWorkouts.length === 0 ? (
        <Card>
          <EmptyState text="После первой тренировки здесь появится история." />
        </Card>
      ) : (
        recentWorkouts.map((session) => (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("WorkoutDetails", { workoutId: session.id })
            }
          >
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                }}
              >
                <View
                  style={{
                    backgroundColor: colors.secondarySurface,
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {session.trainingDayNameSnapshot ?? "Тренировка"}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {session.startedAt?.slice(0, 10)} ·{" "}
                    {formatDuration(session.durationSec)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
};
