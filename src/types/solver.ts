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
  tons: number;
  dest0Tons: number;
  dest1Tons: number;
  /** Resource consumption per period — index matches resource id */
  resourceUsed: number[];
  /** PCPSP upper limit per resource for this period */
  resourceLimits: number[];
}

export interface SolverResult {
  name: string;
  /** Number of periods present in the manager schedule */
  periods: number;
  /** Period indices used in the schedule (sorted) */
  activePeriods: number[];
  destinations: number;
  nResources: number;
  discountRate: number;
  blockCount: number;
  output: BraidOutput;
  totalNpv: number;
  totalTons: number;
  /** Total consumption per resource across all active periods */
  totalResourceUsed: number[];
  periodStats: PeriodStat[];
  destinationSplit: { ore: number; waste: number };
  fileNames: { pcpsp: string; prec: string; blocks: string };
  engine: string;
  coordinates?: Record<number, BlockCoordinate>;
}
