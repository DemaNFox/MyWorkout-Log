import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '@app/providers/DatabaseProvider';
import { SettingsRepository } from '@entities/settings/repository/settingsRepository';
import { darkColors, lightColors, ThemeContext, type ThemeMode } from '@shared/ui/theme';

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const db = useDatabase();
  const [mode, setLocalMode] = useState<ThemeMode>('light');

  useEffect(() => {
    void new SettingsRepository(db).get().then(settings => setLocalMode(settings.themeMode));
  }, [db]);

  const value = useMemo(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      setMode: async (nextMode: ThemeMode) => {
        const repository = new SettingsRepository(db);
        const settings = await repository.get();
        await repository.update({ ...settings, themeMode: nextMode });
        setLocalMode(nextMode);
      },
    }),
    [db, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
