import { StyleSheet, Text, View } from 'react-native';

import { spacing, useThemeColors } from './theme';

interface StatusBadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'danger';
}

export const StatusBadge = ({ label, tone = 'neutral' }: StatusBadgeProps) => {
  const colors = useThemeColors();
  const toneColors = {
    neutral: {
      backgroundColor: colors.badgeNeutralBackground,
      color: colors.badgeNeutralText,
    },
    success: {
      backgroundColor: colors.badgeSuccessBackground,
      color: colors.badgeSuccessText,
    },
    danger: {
      backgroundColor: colors.badgeDangerBackground,
      color: colors.badgeDangerText,
    },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: toneColors.backgroundColor }]}>
      <Text style={{ color: toneColors.color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
