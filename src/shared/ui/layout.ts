import { useWindowDimensions } from 'react-native';

export interface LayoutMetrics {
  controlMinHeight: number;
  screenPadding: number;
  cardPadding: number;
  compact: boolean;
}

export const useLayoutMetrics = (): LayoutMetrics => {
  const { width } = useWindowDimensions();
  const compact = width < 360;

  return {
    controlMinHeight: compact ? 44 : 48,
    screenPadding: compact ? 12 : 16,
    cardPadding: compact ? 12 : 16,
    compact,
  };
};
