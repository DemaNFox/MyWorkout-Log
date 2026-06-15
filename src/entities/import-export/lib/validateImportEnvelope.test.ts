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
});
