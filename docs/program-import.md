# Импорт тренировочной программы

## Импорт на Android

1. Подготовьте JSON-файл в формате ниже или получите его через `Settings -> Export programs JSON`.
2. Откройте `Settings`.
3. В блоке `Import JSON` нажмите `Import JSON file`.
4. Выберите файл через системный файловый менеджер Android.
5. Дождитесь сообщения `Import complete`.
6. Откройте `Plans`: импортированная программа будет добавлена как отдельная программа.
7. Проверьте дни и упражнения, затем сделайте нужную программу активной.

Также JSON можно вставить вручную в поле `Settings -> Import JSON -> JSON` и нажать `Import`.

Импорт не удаляет существующие программы и историю. Повторный импорт создаёт ещё одну программу.

## Рекомендуемый формат

Новые файлы используют `schemaVersion: 2` и `type: "workout-programs"`. Один файл может содержать
одну или несколько программ.

```json
{
  "schemaVersion": 2,
  "type": "workout-programs",
  "exportedAt": "2026-07-21T12:00:00.000Z",
  "payload": {
    "exerciseDictionary": [
      {
        "id": "custom-landmine-press",
        "name": "Жим лэндмайн одной рукой",
        "primaryMuscles": ["shoulders"],
        "movementType": "vertical_press",
        "equipmentType": "barbell",
        "defaultMeasurementType": "weight_reps",
        "defaultWeightMode": "total",
        "isCustom": true
      }
    ],
    "programs": [
      {
        "name": "Моя программа",
        "days": [
          {
            "name": "День 1",
            "order": 1,
            "exercises": [
              {
                "name": "Жим лэндмайн одной рукой",
                "exerciseId": "custom-landmine-press",
                "metricType": "reps",
                "measurementType": "weight_reps",
                "weightMode": "total",
                "targetSets": 3,
                "targetReps": 10,
                "targetWeight": 20,
                "targetDurationSec": null,
                "note": null,
                "order": 1
              },
              {
                "name": "Plank",
                "exerciseId": "plank",
                "metricType": "duration",
                "measurementType": "duration",
                "weightMode": null,
                "targetSets": 3,
                "targetReps": 0,
                "targetWeight": 0,
                "targetDurationSec": 60,
                "note": "Keep hips level",
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

## Как переносятся упражнения

- Встроенное упражнение указывается через стабильный `exerciseId`, например `plank`.
- Личное упражнение должно присутствовать в `payload.exerciseDictionary` с `isCustom: true`.
- При импорте приложение сначала добавляет отсутствующие личные упражнения в локальный каталог,
  затем создаёт дни и упражнения программы.
- Если личное упражнение с таким ID уже существует, повторно оно не создаётся.
- Если такое же название занято другим упражнением, импорт завершается понятной ошибкой, чтобы не
  связать историю с неверными метаданными.

Экспорт через `Settings -> Export programs JSON` формирует `exerciseDictionary` автоматически и
включает только упражнения, используемые выбранными программами.

## Допустимые значения

`measurementType`:

- `weight_reps` — внешний вес и повторения;
- `bodyweight_reps` — собственный вес и повторения;
- `duration` — время;
- `assisted_reps` — повторения с помощью или противовесом.

`weightMode`:

- `per_dumbbell` — указан вес одной гантели;
- `total` — указан общий внешний вес, например гриф вместе с блинами.

`equipmentType`:

- `bodyweight`, `dumbbell`, `barbell`, `kettlebell`;
- `machine`, `cable`, `band`, `other`.

Полные списки мышечных групп и типов движения находятся в
[`exercise-dictionary.md`](exercise-dictionary.md).

## Валидация

Импорт отклоняется, если:

- JSON синтаксически некорректен;
- `schemaVersion` не равен `1` или `2`;
- `type` не поддерживается;
- отсутствует название программы, дня или упражнения;
- `targetSets` не является положительным числом;
- вес, повторения или порядок отрицательны;
- для упражнения по времени отсутствует положительный `targetDurationSec`;
- справочник содержит неизвестный тип снаряда, мышцы, движения или измерения;
- личное упражнение конфликтует с существующим каталогом.

Формат `schemaVersion: 1` продолжает поддерживаться для старых файлов, но не переносит полные
метаданные личных упражнений. Для новых файлов используйте только версию 2.
