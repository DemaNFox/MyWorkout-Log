import type { MeasurementType, WeightMode } from '@shared/types/domain';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'shoulders'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'abs'
  | 'lower_back';

export type MovementType =
  | 'horizontal_press'
  | 'incline_press'
  | 'vertical_press'
  | 'row'
  | 'vertical_pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'isolation'
  | 'core'
  | 'calves'
  | 'forearms'
  | 'carry';

export type EquipmentType =
  | 'bodyweight'
  | 'dumbbell'
  | 'barbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'band'
  | 'other';

export interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  movementType: MovementType;
  equipmentType: EquipmentType;
  defaultMeasurementType: MeasurementType;
  defaultWeightMode?: WeightMode;
  isCustom?: boolean;
}
