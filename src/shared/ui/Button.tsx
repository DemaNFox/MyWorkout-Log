import type { PropsWithChildren } from 'react';
import { Pressable, Text } from 'react-native';

import { spacing, useThemeColors } from './theme';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const Button = ({ children, onPress, variant = 'primary', disabled = false }: ButtonProps) => {
  const colors = useThemeColors();
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: variant === 'danger' ? colors.danger : isSecondary ? colors.secondarySurface : colors.primary,
          borderWidth: isSecondary ? 1 : 0,
          borderColor: colors.secondaryBorder,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      <Text
        style={{
          color: isSecondary ? colors.secondaryText : colors.primaryText,
          fontSize: 16,
          fontWeight: '700',
        }}>
        {children}
      </Text>
    </Pressable>
  );
};
