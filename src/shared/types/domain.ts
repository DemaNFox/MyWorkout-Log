export type PlanStatus = 'active' | 'inactive' | 'archived';

export type WorkoutStatus = 'planned' | 'completed' | 'skipped' | 'interrupted';

export type ExerciseMetricType = 'reps' | 'duration';

export type MeasurementType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'duration'
  | 'assisted_reps';

export type WeightMode = 'per_dumbbell' | 'total';

export type SetEffort = 'easy' | 'moderate' | 'hard' | 'failure';

export type WeightUnit = 'kg' | 'lb';

export type ImportExportType =
  | 'workout-plan'
  | 'workout-programs'
  | 'workout-session'
  | 'program-history'
  | 'full-backup';

export type TrendDirection = 'up' | 'down' | 'same' | 'none';

export type ISODateString = string;
