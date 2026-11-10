import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useLayoutMetrics } from './layout';
import { spacing, useThemeColors } from './theme';

interface ScreenProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  bottomInset?: number;
}

export const Screen = ({ title, eyebrow, subtitle, children, bottomInset = 48 }: ScreenProps) => {
  const colors = useThemeColors();
  const layout = useLayoutMetrics();

  return (
    <ScrollView
      contentContainerStyle={{ padding: layout.screenPadding, paddingBottom: bottomInset }}
      style={{ flex: 1, backgroundColor: colors.background }}>
      {eyebrow ? <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: spacing.xs }}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg }}>{subtitle}</Text> : <View style={{ height: spacing.lg }} />}
      <View style={{ gap: spacing.lg }}>{children}</View>
    </ScrollView>
  );
};
