import type { BraidOutput } from './braid';

export interface BlockCoordinate {
  id: number;
  x: number;
  y: number;
  z: number;
}

export interface PeriodStat {
  period: number;
  blockCount: number;
  npv: number;
  tons?: number;
  capacity?: number;
  dest0Tons?: number;
  dest1Tons?: number;
  dest0Capacity?: number;
  dest1Capacity?: number;
  capacityLimit?: number;
}

export interface SolverResult {
  name: string;
  periods: number;
  destinations: number;
  discountRate: number;
  blockCount: number;
  output: BraidOutput;
  totalNpv: number;
  totalTons?: number;
  totalCapacity?: number;
  capacityLimitsByPeriod?: number[];
  periodStats: PeriodStat[];
  destinationSplit: { ore: number; waste: number };
  fileNames: { pcpsp: string; prec: string };
  engine: string;
  coordinates?: Record<number, BlockCoordinate>;
}
