import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { spacing, useThemeColors } from './theme';

export const Card = ({ children }: PropsWithChildren) => {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        padding: spacing.lg,
        gap: spacing.md,
      }}>
      {children}
    </View>
  );
};
