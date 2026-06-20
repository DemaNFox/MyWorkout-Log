# Workout Logger

Offline-first Android workout logger built with React Native, TypeScript, and SQLite.

The app is intentionally focused on three jobs:

- plan a workout program;
- run and log a workout;
- review history and exercise progress.

It does not include accounts, backend sync, social features, nutrition tracking, AI coaching, videos, push notifications, or wearable integrations.

## Stack

- React Native + Expo Development Build
- TypeScript strict mode
- SQLite via `expo-sqlite`
- Typed React Navigation
- Jest + React Native Testing Library
- Feature-Sliced Design adapted for React Native

```text
src/app
src/pages
src/widgets
src/features
src/entities
src/shared
```

## Commands

```bash
npm install
npm run start
npm run android
npm run lint
npm run typecheck
npm run test
```

## Data Model

SQLite is the source of truth. UI screens do not use SQL directly; database access goes through repositories and feature services.

The app stores:

- plans, training days, and planned exercises;
- workout sessions, workout exercises, and workout sets;
- completed set values: weight, reps, timestamps;
- rest timer values per set: target seconds, start/end time, logged duration;
- app settings, including theme and timer alert preferences.

History and analytics are not separate storage layers. They are views/calculations over the same local SQLite records:

- History lists finished workout sessions for the active plan.
- Analytics calculates exercise progress from completed sets for the active plan.
- Deleting a workout from history removes it from SQLite, so analytics is recalculated without it.

## Workout History

Open `History` to review finished workouts for the currently active plan.

Available actions:

- `Details` opens the workout log.
- `Delete` removes that workout session, its exercises, and its sets from SQLite.
- `Clear history` removes all finished workouts for the active plan without deleting the plan itself.

Open/current workouts are not cleared by `Clear history`.

## Import And Export

Open `Settings` for all import/export actions.

### Export Programs

Use `Settings -> Export programs`.

Flow:

1. Tap `Export programs`.
2. Select one or more programs with checkboxes.
3. Confirm export.
4. Android opens the share sheet so you can save or send the JSON file.

The exported file uses one JSON envelope. It can contain one program or many programs:

```json
{
  "schemaVersion": 1,
  "type": "workout-programs",
  "exportedAt": "2026-06-20T12:00:00.000Z",
  "payload": {
    "programs": [
      {
        "name": "Beginner Strength",
        "days": [
          {
            "name": "Day A",
            "order": 1,
            "exercises": [
              {
                "name": "Squat",
                "targetSets": 3,
                "targetReps": 5,
                "targetWeight": 60,
                "note": "Warm up before working sets",
                "order": 1
              },
              {
                "name": "Bench press",
                "targetSets": 3,
                "targetReps": 5,
                "targetWeight": 50,
                "note": null,
                "order": 2
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Import Programs

Use `Settings -> Import JSON`.

Flow:

1. Tap `Import JSON`.
2. Pick a `.json` file from Android file picker.
3. The app validates `schemaVersion`, `type`, and payload structure.
4. Imported programs are added to the local database.

The recommended import format is the same `workout-programs` envelope used by export. A file can contain one program or several programs.

Rules:

- `schemaVersion` must be `1`.
- `type` should be `"workout-programs"` for one or many programs.
- Program, day, and exercise names must be non-empty.
- `targetSets` must be greater than `0`.
- `targetReps`, `targetWeight`, `order` must be non-negative numbers.
- `note` can be a string or `null`.

Legacy single-program imports with `type: "workout-plan"` are still accepted, but `workout-programs` is the preferred format.

### Export History And Analytics

Use `Settings -> Export history`.

Flow:

1. Tap `Export history`.
2. Select one or more programs.
3. Confirm export.
4. Android opens the share sheet for the generated JSON file.

This export is for external analysis. It includes workout sessions, exercises, sets, rest timer values, and calculated exercise progress.

Example shape:

```json
{
  "schemaVersion": 1,
  "type": "program-history",
  "exportedAt": "2026-06-20T12:00:00.000Z",
  "payload": {
    "programs": [
      {
        "plan": {
          "id": "plan-id",
          "name": "Beginner Strength",
          "status": "active"
        },
        "sessions": [
          {
            "id": "session-id",
            "date": "2026-06-20T10:00:00.000Z",
            "finishedAt": "2026-06-20T10:45:00.000Z",
            "status": "completed",
            "trainingDayName": "Day A",
            "durationSec": 2700,
            "exercises": [
              {
                "id": "exercise-id",
                "name": "Squat",
                "order": 1,
                "sets": [
                  {
                    "index": 1,
                    "targetWeight": 60,
                    "targetReps": 5,
                    "actualWeight": 62.5,
                    "actualReps": 5,
                    "completed": true,
                    "completedAt": "2026-06-20T10:10:00.000Z",
                    "restStartedAt": "2026-06-20T10:10:00.000Z",
                    "restFinishedAt": "2026-06-20T10:11:30.000Z",
                    "restDurationSec": 90,
                    "restTargetSec": 90
                  }
                ]
              }
            ]
          }
        ],
        "exerciseProgress": [
          {
            "exerciseName": "Squat",
            "bestResult": {
              "weight": 62.5,
              "reps": 5,
              "date": "2026-06-20T10:00:00.000Z"
            },
            "history": [
              {
                "workoutSessionId": "session-id",
                "workoutExerciseId": "exercise-id",
                "date": "2026-06-20T10:00:00.000Z",
                "bestWeight": 62.5,
                "repsAtBestWeight": 5,
                "completedSets": 3,
                "trend": "up"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Full Backup

Use `Settings -> Create backup`.

Backup JSON is intended for full local data export. It includes settings, plans, training days, planned exercises, workout sessions, workout exercises, and workout sets.

## Rest Timer

Rest is logged per set.

- Completing a set starts the bottom rest timer.
- The `Rest` row below the completed set shows the logged/resting value.
- When the timer finishes, the app shows an alert modal and can play/vibrate according to Settings.
- Logged rest duration can be edited with the pencil button in the rest row.

Timer alert settings are available in `Settings`:

- silent;
- vibration;
- sound;
- sound + vibration;
- system alarm sound picker;
- in-app volume slider.

## Android Build

Debug/dev builds require Metro because they load JavaScript from the local development server.

Release APK builds package JavaScript into the APK and do not require Metro:

```bash
npx expo prebuild --platform android
android/gradlew :app:assembleRelease -PnewArchEnabled=false
```

On Windows:

```powershell
cd android
.\gradlew.bat assembleRelease -PnewArchEnabled=false
```

The generated APK is written to:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Install over Wi-Fi ADB:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.workoutlogger.mvp -c android.intent.category.LAUNCHER 1
```

By default this local release APK is signed with the debug keystore from the React Native/Expo template. A production keystore is required for store distribution.

## Verification

Before shipping changes, run:

```bash
npm run lint
npm run typecheck
npm run test
```

For Android release verification:

```bash
cd android
.\gradlew.bat assembleRelease -PnewArchEnabled=false
```
