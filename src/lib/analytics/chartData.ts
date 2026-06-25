import type { BraidOutput, BraidOutputRow } from '../../types/braid';
import type { SolverResult } from '../../types/solver';

export interface PeriodRow {
  period: string;
  periodNum: number;
  blocks: number;
  tons: number;
  capacity: number;
  dest0Tons: number;
  dest1Tons: number;
  dest0Capacity: number;
  dest1Capacity: number;
  capacityLimit: number;
  capacityUtilPct: number;
  npv: number;
  cumulativeNpv: number;
  ore: number;
  waste: number;
  oreTons: number;
  wasteTons: number;
  oreCapacity: number;
  wasteCapacity: number;
  npvShare: number;
  utilization: number;
}

function blockMass(row: BraidOutputRow): number {
  const m0 = row.mass_dest0 ?? 0;
  const m1 = row.mass_dest1 ?? 0;
  return row.destination === 0 ? m0 : m1;
}

export function buildPeriodRows(result: SolverResult): PeriodRow[] {
  const outputMetrics = new Map<
    number,
    {
      tons: number;
      capacity: number;
      dest0Tons: number;
      dest1Tons: number;
      dest0Capacity: number;
      dest1Capacity: number;
    }
  >();

  for (const row of result.output) {
    const bucket = outputMetrics.get(row.time_period) ?? {
      tons: 0,
      capacity: 0,
      dest0Tons: 0,
      dest1Tons: 0,
      dest0Capacity: 0,
      dest1Capacity: 0,
    };
    const mass = blockMass(row);
    bucket.tons += mass;
    bucket.capacity += mass;
    if (row.destination === 0) {
      bucket.dest0Tons += row.mass_dest0 ?? 0;
      bucket.dest0Capacity += row.mass_dest0 ?? 0;
    } else {
      bucket.dest1Tons += row.mass_dest1 ?? 0;
      bucket.dest1Capacity += row.mass_dest1 ?? 0;
    }
    outputMetrics.set(row.time_period, bucket);
  }

  const destByPeriod = new Map<number, { ore: number; waste: number; oreTons: number; wasteTons: number; oreCapacity: number; wasteCapacity: number }>();

  for (const row of result.output) {
    const bucket = destByPeriod.get(row.time_period) ?? {
      ore: 0,
      waste: 0,
      oreTons: 0,
      wasteTons: 0,
      oreCapacity: 0,
      wasteCapacity: 0,
    };
    if (row.destination === 0) {
      bucket.ore += 1;
      bucket.oreTons += row.mass_dest0 ?? 0;
      bucket.oreCapacity += row.mass_dest0 ?? 0;
    } else {
      bucket.waste += 1;
      bucket.wasteTons += row.mass_dest1 ?? 0;
      bucket.wasteCapacity += row.mass_dest1 ?? 0;
    }
    destByPeriod.set(row.time_period, bucket);
  }

  const maxCapacity = Math.max(
    ...result.periodStats.map((p) => p.capacity ?? outputMetrics.get(p.period)?.capacity ?? 0),
    1,
  );
  let cumulative = 0;

  return result.periodStats.map((p) => {
    cumulative += p.npv;
    const computed = outputMetrics.get(p.period);
    const dest = destByPeriod.get(p.period) ?? {
      ore: 0,
      waste: 0,
      oreTons: 0,
      wasteTons: 0,
      oreCapacity: 0,
      wasteCapacity: 0,
    };
    const tons = p.tons ?? computed?.tons ?? 0;
    const capacity = p.capacity ?? computed?.capacity ?? 0;
    const dest0Tons = p.dest0Tons ?? computed?.dest0Tons ?? 0;
    const dest1Tons = p.dest1Tons ?? computed?.dest1Tons ?? 0;
    const dest0Capacity = p.dest0Capacity ?? computed?.dest0Capacity ?? 0;
    const dest1Capacity = p.dest1Capacity ?? computed?.dest1Capacity ?? 0;
    const limit =
      p.capacityLimit ??
      result.capacityLimitsByPeriod?.[p.period] ??
      0;
    const capacityUtilPct = limit > 0 ? Math.round((capacity / limit) * 100) : Math.round((capacity / maxCapacity) * 100);

    return {
      period: `P${p.period}`,
      periodNum: p.period,
      blocks: p.blockCount,
      tons,
      capacity,
      dest0Tons,
      dest1Tons,
      dest0Capacity,
      dest1Capacity,
      capacityLimit: limit,
      capacityUtilPct,
      npv: p.npv,
      cumulativeNpv: cumulative,
      ore: dest.ore,
      waste: dest.waste,
      oreTons: dest.oreTons,
      wasteTons: dest.wasteTons,
      oreCapacity: dest.oreCapacity,
      wasteCapacity: dest.wasteCapacity,
      npvShare: result.totalNpv ? (p.npv / result.totalNpv) * 100 : 0,
      utilization: capacityUtilPct,
    };
  });
}

export function periodDistribution(output: BraidOutput, periods: number) {
  const counts = Array.from({ length: periods }, (_, i) => ({
    period: `P${i}`,
    count: 0,
  }));
  for (const row of output) {
    if (row.time_period < counts.length) counts[row.time_period].count += 1;
  }
  return counts;
}

export function summaryInsights(rows: PeriodRow[], result: SolverResult) {
  const peakCapacity = rows.reduce((a, b) => (b.capacity > a.capacity ? b : a), rows[0]);
  const peakTons = rows.reduce((a, b) => (b.tons > a.tons ? b : a), rows[0]);
  const topNpv = rows.reduce((a, b) => (b.npv > a.npv ? b : a), rows[0]);
  const totalOre = rows.reduce((sum, row) => sum + row.ore, 0);
  const orePct = result.blockCount ? ((totalOre / result.blockCount) * 100).toFixed(1) : '0';

  return {
    peakPeriod: peakCapacity?.period ?? '—',
    peakBlocks: peakCapacity?.blocks ?? 0,
    peakTons: peakTons?.tons ?? 0,
    peakCapacity: peakCapacity?.capacity ?? 0,
    peakDest1Capacity: rows.reduce((max, row) => Math.max(max, row.dest1Capacity), 0),
    topNpvPeriod: topNpv?.period ?? '—',
    orePct,
    avgBlocks: rows.length ? Math.round(result.blockCount / rows.length) : 0,
    avgTons: rows.length ? Math.round((result.totalTons ?? rows.reduce((s, r) => s + r.tons, 0)) / rows.length) : 0,
    avgCapacity: rows.length ? Math.round((result.totalCapacity ?? rows.reduce((s, r) => s + r.capacity, 0)) / rows.length) : 0,
  };
}

export function fmtTons(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M t`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k t`;
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} t`;
}
