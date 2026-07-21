import { ExpoDatabase } from './expoDatabase';

describe('ExpoDatabase', () => {
  it('reuses the active transaction for nested repository operations', async () => {
    let nativeTransactionActive = false;
    const nativeDatabase = {
      withTransactionAsync: jest.fn(async (work: () => Promise<void>) => {
        if (nativeTransactionActive) {
          throw new Error('cannot start a transaction within a transaction');
        }
        nativeTransactionActive = true;
        try {
          await work();
        } finally {
          nativeTransactionActive = false;
        }
      }),
    };
    const database = new ExpoDatabase(nativeDatabase as never);
    const nestedWork = jest.fn(async () => undefined);

    await database.transaction(async () => {
      await database.transaction(nestedWork);
    });

    expect(nestedWork).toHaveBeenCalledTimes(1);
    expect(nativeDatabase.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('allows a new transaction after a failed transaction', async () => {
    const nativeDatabase = {
      withTransactionAsync: jest.fn(async (work: () => Promise<void>) => work()),
    };
    const database = new ExpoDatabase(nativeDatabase as never);

    await expect(
      database.transaction(async () => {
        throw new Error('import failed');
      }),
    ).rejects.toThrow('import failed');

    await expect(database.transaction(async () => undefined)).resolves.toBeUndefined();
    expect(nativeDatabase.withTransactionAsync).toHaveBeenCalledTimes(2);
  });
});
