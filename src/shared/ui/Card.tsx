import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useLayoutMetrics } from './layout';
import { spacing, useThemeColors } from './theme';

export const Card = ({ children }: PropsWithChildren) => {
  const colors = useThemeColors();
  const layout = useLayoutMetrics();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: layout.cardPadding,
        gap: spacing.md,
      }}>
      {children}
    </View>
  );
};
