export type PlanStatus = 'active' | 'inactive' | 'archived';

export type WorkoutStatus = 'planned' | 'completed' | 'skipped' | 'interrupted';

export type WeightUnit = 'kg' | 'lb';

export type ImportExportType =
  | 'workout-plan'
  | 'workout-programs'
  | 'workout-session'
  | 'program-history'
  | 'full-backup';

export type TrendDirection = 'up' | 'down' | 'same' | 'none';

export type ISODateString = string;
