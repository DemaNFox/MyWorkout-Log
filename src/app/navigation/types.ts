export type RootStackParamList = {
  MainTabs: undefined;
  PlanDetails: { planId: string };
  WorkoutSession: { workoutId: string };
  WorkoutDetails: { workoutId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Plans: undefined;
  History: undefined;
  Analytics: undefined;
  Settings: undefined;
};
