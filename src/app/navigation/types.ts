export type RootStackParamList = {
  MainTabs: undefined;
  PlanDetails: { planId: string };
  WorkoutSession: { workoutId: string };
  WorkoutDetails: { workoutId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Plans: undefined;
  Exercises: undefined;
  History: undefined;
  Analytics: undefined;
  Settings: undefined;
};
