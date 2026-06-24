import { AppError } from '@shared/lib/errors';

import { parseImportEnvelope } from './validateImportEnvelope';

describe('parseImportEnvelope', () => {
  it('accepts a valid workout plan export', () => {
    const envelope = parseImportEnvelope(
      JSON.stringify({
        schemaVersion: 1,
        type: 'workout-plan',
        exportedAt: '2026-06-15T12:00:00.000Z',
        payload: {
          name: 'Push Pull Legs',
          days: [
            {
              name: 'Push',
              order: 1,
              exercises: [
                {
                  name: 'Bench press',
                  targetSets: 4,
                  targetReps: 8,
                  targetWeight: 80,
                  note: null,
                  order: 1,
                },
              ],
            },
          ],
        },
      }),
    );

    expect(envelope.type).toBe('workout-plan');
  });

  it('accepts a valid workout programs export', () => {
    const envelope = parseImportEnvelope(
      JSON.stringify({
        schemaVersion: 1,
        type: 'workout-programs',
        exportedAt: '2026-06-15T12:00:00.000Z',
        payload: {
          programs: [
            {
              name: 'Strength',
              days: [
                {
                  name: 'Day 1',
                  order: 1,
                  exercises: [
                    {
                      name: 'Squat',
                      targetSets: 3,
                      targetReps: 5,
                      targetWeight: 100,
                      note: 'Controlled reps',
                      order: 1,
                    },
                  ],
                },
              ],
            },
            {
              name: 'Hypertrophy',
              days: [],
            },
          ],
        },
      }),
    );

    expect(envelope.type).toBe('workout-programs');
  });

  it('rejects invalid json', () => {
    expect(() => parseImportEnvelope('{')).toThrow(AppError);
  });

  it('rejects negative target weight', () => {
    expect(() =>
      parseImportEnvelope(
        JSON.stringify({
          schemaVersion: 1,
          type: 'workout-plan',
          exportedAt: '2026-06-15T12:00:00.000Z',
          payload: {
            name: 'Plan',
            days: [
              {
                name: 'Day',
                order: 1,
                exercises: [
                  {
                    name: 'Lift',
                    targetSets: 1,
                    targetReps: 5,
                    targetWeight: -1,
                    order: 1,
                  },
                ],
              },
            ],
          },
        }),
      ),
    ).toThrow(AppError);
  });

  it('accepts a timed exercise and rejects a missing duration', () => {
    const createEnvelope = (targetDurationSec?: number) => ({
      schemaVersion: 1,
      type: 'workout-plan',
      exportedAt: '2026-06-24T12:00:00.000Z',
      payload: {
        name: 'Core',
        days: [{
          name: 'Day',
          order: 1,
          exercises: [{
            name: 'Plank',
            metricType: 'duration',
            targetSets: 3,
            targetReps: 0,
            targetWeight: 0,
            ...(targetDurationSec === undefined ? {} : { targetDurationSec }),
            order: 1,
          }],
        }],
      },
    });

    expect(parseImportEnvelope(JSON.stringify(createEnvelope(60))).type).toBe('workout-plan');
    expect(() => parseImportEnvelope(JSON.stringify(createEnvelope()))).toThrow(AppError);
  });
});
