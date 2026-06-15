import type { TrendDirection } from '@shared/types/domain';

export const getTrendColor = (trend: TrendDirection): string => {
  switch (trend) {
    case 'up':
      return '#15803d';
    case 'down':
      return '#b91c1c';
    case 'same':
    case 'none':
      return '#64748b';
  }
};
