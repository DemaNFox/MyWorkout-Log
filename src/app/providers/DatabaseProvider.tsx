import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ExpoDatabase } from '@shared/db/client/expoDatabase';
import { runMigrations } from '@shared/db/migrations';
import type { Database } from '@shared/db/types';
import { colors } from '@shared/ui/theme';
import { seedMockProgram } from '@features/mock-data/model/seedMockProgram';

const DatabaseContext = createContext<Database | null>(null);

export const DatabaseProvider = ({ children }: PropsWithChildren) => {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    ExpoDatabase.open()
      .then(async database => {
        await runMigrations(database);
        await seedMockProgram(database);
        if (mounted) {
          setDb(database);
        }
      })
      .catch((reason: unknown) => {
        if (mounted) {
          setError(reason instanceof Error ? reason.message : 'Database is unavailable');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.danger, fontSize: 16 }}>{error}</Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
};

export const useDatabase = (): Database => {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('DatabaseProvider is missing');
  }
  return db;
};
