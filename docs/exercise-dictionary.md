# Exercise dictionary

## Purpose and location

The exercise dictionary is the source of truth for exercise metadata. Its data is stored in
`src/entities/exercise/data/exercises.json`; application code accesses it only through
`src/entities/exercise/model/exerciseCatalog.ts`.

Workout plans and sessions reference catalog records through a stable `exerciseId`. Completed
history also keeps `nameSnapshot` so a later catalog rename does not rewrite what the user saw at
the time. Muscle groups, movement type, and default measurement settings are never copied into a
workout session.

## Exercise structure

```ts
interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  movementType: MovementType;
  equipmentType: EquipmentType;
  defaultMeasurementType: MeasurementType;
  defaultWeightMode?: WeightMode;
}
```

Allowed `MuscleGroup` values:

```txt
chest, back, lats, traps, shoulders, front_delts, side_delts, rear_delts,
biceps, triceps, forearms, quads, hamstrings, glutes, calves, core, abs, lower_back
```

Allowed `MovementType` values:

```txt
horizontal_press, incline_press, vertical_press, row, vertical_pull, squat, hinge,
lunge, isolation, core, calves, forearms, carry
```

Allowed `MeasurementType` values are `weight_reps`, `bodyweight_reps`, `duration`, and
`assisted_reps`. Allowed `WeightMode` values are `per_dumbbell` and `total`.
`defaultWeightMode` is present only when an exercise uses external weight.

Allowed `EquipmentType` values are `bodyweight`, `dumbbell`, `barbell`, `kettlebell`, `machine`,
`cable`, `band`, and `other`. Equipment describes the implement; weight mode describes how its
weight is entered. For example, a barbell normally uses `total`, while dumbbells normally use
`per_dumbbell`.

Built-in exercises live in JSON. Exercises created in the app live in the local
`custom_exercises` SQLite table. `ExerciseCatalogRepository` combines both sources for UI and plan
selection.

Built-in records are the protected application reference catalog: users may view and select them,
but cannot edit or delete them. Create, edit, and delete operations apply only to records with
`isCustom: true`. Custom exercises currently used by a workout plan must be removed from that plan
before they can be deleted. Completed workout history keeps its exercise ID and name snapshot.

## Adding an exercise

1. Add one object to `exercises.json`.
2. Choose a unique, stable, English kebab-case ID such as `dumbbell-bench-press`.
3. Do not derive the ID from a translated label at runtime and never change an ID already used in
   plans or history.
4. Add the user-facing name, optional aliases, at least one primary muscle, a movement type, and a
   default measurement type.
5. Add a default weight mode only for `weight_reps` exercises.
6. Run lint, typecheck, and tests. The catalog tests cover lookup by IDs, names, and aliases.

Example:

```json
{
  "id": "dumbbell-bench-press",
  "name": "Dumbbell Bench Press",
  "aliases": ["Жим гантелей лёжа"],
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps", "front_delts"],
  "movementType": "horizontal_press",
  "equipmentType": "dumbbell",
  "defaultMeasurementType": "weight_reps",
  "defaultWeightMode": "per_dumbbell"
}
```

## Using the catalog

Use `ExerciseCatalogRepository` when application code needs the combined built-in and custom
catalog. Feature and page code must not import the JSON file or query `custom_exercises` directly. A session stores `exerciseId`, session-specific
`measurementType`/`weightMode`, individual sets, and optional effort. It must not duplicate muscle
or movement metadata.

Legacy or user-entered names that do not yet exist in the catalog retain a `null` reference during
the non-destructive migration. Add the exercise to the dictionary before relying on metadata-based
analytics for those records.
