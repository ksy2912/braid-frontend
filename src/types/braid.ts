/** BRAID solver output — one row per scheduled block */
export interface BraidOutputRow {
  block_id: number;
  destination: number;
  time_period: number;
  value?: number;
  mass_dest0?: number;
  mass_dest1?: number;
}

export type BraidOutput = BraidOutputRow[];
