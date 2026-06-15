import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';

export const lightColors = {
  background: '#f4f7f6',
  surface: '#ffffff',
  text: '#17202a',
  muted: '#667085',
  border: '#d5dfdc',
  primary: '#166b64',
  primaryText: '#ffffff',
  secondarySurface: '#edf3f1',
  secondaryText: '#263238',
  secondaryBorder: '#c8d6d2',
  badgeNeutralBackground: '#e8eeec',
  badgeNeutralText: '#263238',
  badgeSuccessBackground: '#dff5e8',
  badgeSuccessText: '#12633a',
  badgeDangerBackground: '#fde4df',
  badgeDangerText: '#9f2418',
  success: '#16834a',
  danger: '#b42318',
  warning: '#b7791f',
  chartWeight: '#1f7a73',
  chartReps: '#8a5a00',
};

export const darkColors = {
  background: '#0d1117',
  surface: '#171b22',
  text: '#f2f5f7',
  muted: '#a6b0bd',
  border: '#303846',
  primary: '#2f6fed',
  primaryText: '#ffffff',
  secondarySurface: '#242b35',
  secondaryText: '#edf2f7',
  secondaryBorder: '#46515f',
  badgeNeutralBackground: '#28313c',
  badgeNeutralText: '#edf2f7',
  badgeSuccessBackground: '#163927',
  badgeSuccessText: '#8ee6ad',
  badgeDangerBackground: '#44231f',
  badgeDangerText: '#ffb4a8',
  success: '#5fd18b',
  danger: '#ff8a7a',
  warning: '#f0c36a',
  chartWeight: '#8ab4f8',
  chartReps: '#5eead4',
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
