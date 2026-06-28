import type { BraidOutput } from '../../types/braid';
import type { SolverResult } from '../../types/solver';

export interface PeriodRow {
  period: string;
  periodNum: number;
  blocks: number;
  /** Resource 0 consumption this period (scheduled routing) */
  res0Tons: number;
  /** Resource 1 consumption this period (scheduled routing) */
  res1Tons: number;
  /** Resource 0 routed to destination 0 (dest-0 path coeff) */
  dest0Tons: number;
  /** Resource 0 routed to destination 1 (dest-1 path coeff) */
  dest1Tons: number;
  resourceUsed: number[];
  resourceLimits: number[];
  resourceUtilPct: number[];
  npv: number;
  cumulativeNpv: number;
  ore: number;
  waste: number;
  npvShare: number;
}

export function buildPeriodRows(result: SolverResult): PeriodRow[] {
  const destByPeriod = new Map<number, { ore: number; waste: number }>();

  for (const row of result.output) {
    const bucket = destByPeriod.get(row.time_period) ?? { ore: 0, waste: 0 };
    if (row.destination === 0) bucket.ore += 1;
    else bucket.waste += 1;
    destByPeriod.set(row.time_period, bucket);
  }

  let cumulative = 0;

  return result.periodStats.map((p) => {
    cumulative += p.npv;
    const dest = destByPeriod.get(p.period) ?? { ore: 0, waste: 0 };
    const resourceUtilPct = p.resourceUsed.map((used, r) => {
      const limit = p.resourceLimits[r] ?? 0;
      return limit > 0 ? Math.round((used / limit) * 100) : 0;
    });

    return {
      period: `P${p.period}`,
      periodNum: p.period,
      blocks: p.blockCount,
      res0Tons: p.resourceUsed[0] ?? 0,
      res1Tons: p.resourceUsed[1] ?? 0,
      dest0Tons: p.dest0Tons,
      dest1Tons: p.dest1Tons,
      resourceUsed: p.resourceUsed,
      resourceLimits: p.resourceLimits,
      resourceUtilPct,
      npv: p.npv,
      cumulativeNpv: cumulative,
      ore: dest.ore,
      waste: dest.waste,
      npvShare: result.totalNpv ? (p.npv / result.totalNpv) * 100 : 0,
    };
  });
}

export function periodDistribution(output: BraidOutput, activePeriods: number[]) {
  const counts = activePeriods.map((p) => ({
    period: `P${p}`,
    count: 0,
  }));
  const indexByPeriod = new Map(activePeriods.map((p, i) => [p, i]));
  for (const row of output) {
    const idx = indexByPeriod.get(row.time_period);
    if (idx !== undefined) counts[idx].count += 1;
  }
  return counts;
}

export function summaryInsights(rows: PeriodRow[], result: SolverResult) {
  const peakResource = rows.reduce(
    (best, row) => {
      const maxUsed = Math.max(...row.resourceUsed, 0);
      return maxUsed > best.peakUsed ? { period: row.period, peakUsed: maxUsed } : best;
    },
    { period: '—', peakUsed: 0 }
  );
  const peakTons = rows.reduce((a, b) => (b.res0Tons > a.res0Tons ? b : a), rows[0]);
  const topNpv = rows.reduce((a, b) => (b.npv > a.npv ? b : a), rows[0]);
  const totalOre = rows.reduce((sum, row) => sum + row.ore, 0);
  const orePct = result.blockCount ? ((totalOre / result.blockCount) * 100).toFixed(1) : '0';

  return {
    peakPeriod: peakResource.period,
    peakResourceUsed: peakResource.peakUsed,
    peakTons: peakTons?.res0Tons ?? 0,
    topNpvPeriod: topNpv?.period ?? '—',
    orePct,
    avgTons: rows.length ? Math.round(result.totalTons / rows.length) : 0,
  };
}

export function fmtTons(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M t`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k t`;
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} t`;
}
