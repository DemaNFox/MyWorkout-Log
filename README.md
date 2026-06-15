# Workout Logger

Production-like MVP Android app for offline-first workout logging.

## Stack

- React Native + Expo Development Build
- TypeScript strict
- SQLite via `expo-sqlite`
- Typed React Navigation
- Jest + React Native Testing Library
- Adapted Feature-Sliced Design:

```text
src/app
src/pages
src/widgets
src/features
src/entities
src/shared
```

## Scope

The app supports local workout plans, training days, planned exercises, workout sessions, set logging, history, exercise dynamics analytics, JSON import/export, and full backup JSON creation.

It intentionally does not include AI coaching, social features, nutrition, body weight tracking, videos, push notifications, backend, accounts, or cloud sync.

## Commands

```bash
npm install
npm run start
npm run android
npm run lint
npm run typecheck
npm run test
```

## Data Boundary

SQLite is the source of truth. UI screens do not use SQL directly; database operations go through repositories and feature services.

The app has no backend, accounts, or cloud sync. Data is stored in the Android app sandbox in the local SQLite database opened by `expo-sqlite`.

## Import Format

Use **Settings -> Import JSON** to import a workout program. The currently supported import type for creating a new program is `workout-plan`.

Minimal valid file:

```json
{
  "schemaVersion": 1,
  "type": "workout-plan",
  "exportedAt": "2026-06-15T12:00:00.000Z",
  "payload": {
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
      },
      {
        "name": "Day B",
        "order": 2,
        "exercises": [
          {
            "name": "Deadlift",
            "targetSets": 1,
            "targetReps": 5,
            "targetWeight": 80,
            "note": null,
            "order": 1
          },
          {
            "name": "Overhead press",
            "targetSets": 3,
            "targetReps": 5,
            "targetWeight": 35,
            "note": null,
            "order": 2
          }
        ]
      }
    ]
  }
}
```

Field rules:

- `schemaVersion` must be `1`.
- `type` must be `"workout-plan"` for program import.
- `payload.name`, day `name`, and exercise `name` must be non-empty strings.
- `targetSets` must be greater than `0`.
- `targetReps`, `targetWeight`, day `order`, and exercise `order` must be non-negative numbers.
- `note` can be a string or `null`.

Import creates a new inactive/regular plan with its training days and planned exercises. Workout history is not created from a `workout-plan` import.

The app can also create a `full-backup` JSON in Settings. That format is intended as a full local backup/export artifact; program import should use `workout-plan`.

## Android Build

Debug/dev builds require Metro because they load the JavaScript bundle from the local development server.

Release APK builds package the JavaScript bundle into the APK and do not require Metro:

```bash
npx expo prebuild --platform android
android/gradlew :app:assembleRelease
```

On Windows, React Native CMake paths can exceed the 260 character limit. If release build fails with a long path error, build from a short junction path, for example:

```powershell
New-Item -ItemType Junction -Path C:\wlp -Target "C:\path\to\personal_training_helper"
cd C:\wlp
android\gradlew.bat -p android :app:assembleRelease
```

The generated APK is written to:

```text
android/app/build/outputs/apk/release/app-release.apk
```

By default this local release APK is signed with the debug keystore from the React Native/Expo template. A production keystore is required for store distribution.

## Verification

Current verified checks:

```bash
npm run lint
npm run typecheck
npm run test
```
