import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useLayoutMetrics } from './layout';
import { spacing, useThemeColors } from './theme';

interface ScreenProps extends PropsWithChildren {
  title: string;
  bottomInset?: number;
}

export const Screen = ({ title, children, bottomInset = 48 }: ScreenProps) => {
  const colors = useThemeColors();
  const layout = useLayoutMetrics();

  return (
    <ScrollView
      contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: bottomInset }}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg }}>{title}</Text>
      <View style={{ gap: spacing.lg }}>{children}</View>
    </ScrollView>
  );
};
