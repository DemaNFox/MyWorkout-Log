import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';

export const lightColors = {
  background: '#f5f7f4',
  surface: '#ffffff',
  text: '#162520',
  muted: '#687770',
  border: '#e2e9e4',
  primary: '#176c58',
  primaryText: '#ffffff',
  secondarySurface: '#e5f2eb',
  secondaryText: '#176c58',
  secondaryBorder: '#d7e8dc',
  badgeNeutralBackground: '#e8eeec',
  badgeNeutralText: '#263238',
  badgeSuccessBackground: '#dff5e8',
  badgeSuccessText: '#12633a',
  badgeDangerBackground: '#fde4df',
  badgeDangerText: '#9f2418',
  success: '#16834a',
  danger: '#b42318',
  warning: '#b7791f',
  chartWeight: '#176c58',
  chartReps: '#b4793d',
};

export const darkColors = {
  background: '#101a18',
  surface: '#1b2825',
  text: '#f1f6f2',
  muted: '#a7b8af',
  border: '#31423b',
  primary: '#6dd8af',
  primaryText: '#10271d',
  secondarySurface: '#233e32',
  secondaryText: '#9fe8c2',
  secondaryBorder: '#365948',
  badgeNeutralBackground: '#273b33',
  badgeNeutralText: '#d8eee0',
  badgeSuccessBackground: '#163927',
  badgeSuccessText: '#8ee6ad',
  badgeDangerBackground: '#44231f',
  badgeDangerText: '#ffb4a8',
  success: '#5fd18b',
  danger: '#ff8a7a',
  warning: '#f0c36a',
  chartWeight: '#6dd8af',
  chartReps: '#efbd80',
};

export const colors = lightColors;

export type ThemeColors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  setMode: async () => undefined,
});

export const useThemeColors = (): ThemeColors => useContext(ThemeContext).colors;

export const useThemeMode = (): ThemeContextValue => useContext(ThemeContext);
