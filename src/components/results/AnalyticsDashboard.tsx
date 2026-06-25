import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  PolarAngleAxis,
  PolarGrid,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PeriodRow } from '../../lib/analytics/chartData';
import { fmtTons } from '../../lib/analytics/chartData';
import type { SolverResult } from '../../types/solver';
import { ChartCard, chartTheme, tooltipStyle } from './ChartCard';

const fmtUsdFull = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AnalyticsDashboardProps {
  result: SolverResult;
  rows: PeriodRow[];
}

export function AnalyticsDashboard({ result, rows }: AnalyticsDashboardProps) {
  const chartRows = rows.map((r) => ({
    ...r,
    capacityLimitLine: r.capacityLimit > 0 ? r.capacityLimit : null,
  }));

  const radialData = chartRows.map((r) => ({
    name: r.period,
    value: r.capacityUtilPct,
    fill: chartTheme.accent,
  }));

  const limits = chartRows.map((r) => r.capacityLimit).filter((l) => l > 0);
  const uniformLimit = limits.length > 0 && limits.every((l) => l === limits[0]) ? limits[0] : null;
  const hasLimit = limits.length > 0;

  const peakCapacity = Math.max(...chartRows.map((r) => r.capacity), 0);
  const peakLimit = Math.max(...limits, 0);
  const capacityYMax = Math.max(peakCapacity, peakLimit, 1) * 1.08;

  const totalTonsVal = result.totalTons ?? rows.reduce((s, r) => s + r.tons, 0);
  const totalCapVal = result.totalCapacity ?? rows.reduce((s, r) => s + r.capacity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Schedule analytics</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Tons and capacity across {result.periods} periods · Total {fmtTons(totalTonsVal)} · Capacity{' '}
            {fmtTons(totalCapVal)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Tons by period" subtitle="Total tonnes moved each period">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartRows} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => fmtTons(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtTons(v), 'Tons']} />
              <Bar dataKey="tons" fill={chartTheme.ore} radius={[4, 4, 0, 0]} name="Total tons" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Capacity utilization" subtitle="Resource capacity used vs PCPSP upper limit">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis domain={[0, capacityYMax]} tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => fmtTons(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [fmtTons(v), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="capacity" fill="#0284c7" name="Capacity used" barSize={26} radius={[4, 4, 0, 0]} />
              {hasLimit && uniformLimit != null && (
                <ReferenceLine
                  y={uniformLimit}
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{ value: `Limit ${fmtTons(uniformLimit)}`, position: 'insideTopRight', fill: '#dc2626', fontSize: 11 }}
                />
              )}
              {hasLimit && uniformLimit == null && (
                <Line type="monotone" dataKey="capacityLimitLine" stroke="#dc2626" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls name="PCPSP limit" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="NPV by period" subtitle="Discounted value generated each period">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtUsdFull(v), 'NPV']} />
              <Line type="monotone" dataKey="npv" stroke={chartTheme.npv} strokeWidth={2.5} dot={{ r: 3, fill: chartTheme.npv }} name="NPV" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cumulative NPV" subtitle="Running total discounted value">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartRows}>
              <defs>
                <linearGradient id="npvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartTheme.npv} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartTheme.npv} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtUsdFull(v), 'Cumulative NPV']} />
              <ReferenceLine y={0} stroke={chartTheme.axis} strokeDasharray="3 3" />
              <Area type="monotone" dataKey="cumulativeNpv" stroke={chartTheme.npv} fill="url(#npvGrad)" strokeWidth={2} name="Cumulative NPV" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tons by destination" subtitle="Destination 0 vs destination 1 tonnes per period ">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartRows} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => fmtTons(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [fmtTons(v), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="dest0Tons" stackId="t" fill={chartTheme.ore} name="Dest 0 tons" />
              <Bar dataKey="dest1Tons" stackId="t" fill={chartTheme.waste} name="Dest 1 tons" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tons vs value" subtitle="Tonnes moved and NPV on the same timeline">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => fmtTons(v)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="tons" fill={chartTheme.fill} stroke={chartTheme.ore} strokeWidth={1} name="Tons" barSize={20} />
              <Line yAxisId="right" type="monotone" dataKey="npv" stroke={chartTheme.npv} strokeWidth={2} dot={false} name="NPV" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Capacity intensity" subtitle="Capacity used vs PCPSP limit (%)">
          <ResponsiveContainer width="100%" height={240}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData}>
              <PolarGrid stroke={chartTheme.grid} />
              <PolarAngleAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: chartTheme.axis }} />
              <RadialBar background dataKey="value" cornerRadius={4} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n, p) => [`${Math.round(v)}%`, (p as { payload?: { name?: string } })?.payload?.name ?? 'Period']} />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
