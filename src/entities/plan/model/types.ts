import type { PlanStatus } from '@shared/types/domain';

export interface Plan {
  id: string;
  name: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PlanWithStats extends Plan {
  dayCount: number;
}
