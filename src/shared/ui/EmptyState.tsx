import { Text } from 'react-native';

import { useThemeColors } from './theme';

interface EmptyStateProps {
  text: string;
}

export const EmptyState = ({ text }: EmptyStateProps) => {
  const colors = useThemeColors();
  return <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{text}</Text>;
};
