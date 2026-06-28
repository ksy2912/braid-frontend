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

function CapacityResourceChart({
  resourceId,
  rows,
}: {
  resourceId: number;
  rows: PeriodRow[];
}) {
  const usedKey = `res${resourceId}Used`;
  const limitKey = `res${resourceId}Limit`;

  const chartData = rows.map((r) => ({
    period: r.period,
    [usedKey]: r.resourceUsed[resourceId] ?? 0,
    [limitKey]: (r.resourceLimits[resourceId] ?? 0) > 0 ? r.resourceLimits[resourceId] : null,
  }));

  const usedValues = rows.map((r) => r.resourceUsed[resourceId] ?? 0);
  const limits = rows.map((r) => r.resourceLimits[resourceId] ?? 0).filter((l) => l > 0);
  const peakUsed = Math.max(...usedValues, 0);
  const peakLimit = Math.max(...limits, 0);
  const yMax = Math.max(peakUsed, peakLimit, 1) * 1.08;
  const uniformLimit =
    limits.length > 0 && limits.every((l) => l === limits[0]) ? limits[0] : null;
  const hasLimit = limits.length > 0;

  return (
    <ChartCard
      title={`Capacity utilization — resource ${resourceId}`}
      subtitle="Resource consumption vs PCPSP upper limit for this constraint"
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 11, fill: chartTheme.axis }}
            tickFormatter={(v) => fmtTons(v)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => [fmtTons(v), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey={usedKey}
            fill="#0284c7"
            name={`Resource ${resourceId} used`}
            barSize={26}
            radius={[4, 4, 0, 0]}
          />
          {hasLimit && uniformLimit != null && (
            <ReferenceLine
              y={uniformLimit}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{
                value: `Limit ${fmtTons(uniformLimit)}`,
                position: 'insideTopRight',
                fill: '#dc2626',
                fontSize: 11,
              }}
            />
          )}
          {hasLimit && uniformLimit == null && (
            <Line
              type="monotone"
              dataKey={limitKey}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
              name="PCPSP limit"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ResourceIntensityChart({
  resourceId,
  rows,
}: {
  resourceId: number;
  rows: PeriodRow[];
}) {
  const radialData = rows.map((r) => ({
    name: r.period,
    value: r.resourceUtilPct[resourceId] ?? 0,
    fill: chartTheme.accent,
  }));

  return (
    <ChartCard
      title={`Resource ${resourceId} intensity`}
      subtitle={`Resource ${resourceId} used vs PCPSP limit (%)`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData}>
          <PolarGrid stroke={chartTheme.grid} />
          <PolarAngleAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: chartTheme.axis }} />
          <RadialBar background dataKey="value" cornerRadius={4} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, _n, p) => [
              `${Math.round(v)}%`,
              (p as { payload?: { name?: string } })?.payload?.name ?? 'Period',
            ]}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function TonsVsValueChart({
  resourceId,
  rows,
}: {
  resourceId: number;
  rows: PeriodRow[];
}) {
  const tonsKey = resourceId === 0 ? 'res0Tons' : resourceId === 1 ? 'res1Tons' : `res${resourceId}Tons`;
  const chartData =
    resourceId <= 1
      ? rows
      : rows.map((r) => ({
          ...r,
          [`res${resourceId}Tons`]: r.resourceUsed[resourceId] ?? 0,
        }));

  return (
    <ChartCard
      title={`Tons vs value — resource ${resourceId}`}
      subtitle={`Resource ${resourceId} tonnes and NPV on the same timeline`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => fmtTons(v)} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey={tonsKey}
            fill={resourceId === 0 ? chartTheme.fill : chartTheme.waste}
            stroke={resourceId === 0 ? chartTheme.ore : chartTheme.waste}
            strokeWidth={1}
            name={`Resource ${resourceId} tons`}
            barSize={20}
          />
          <Line yAxisId="right" type="monotone" dataKey="npv" stroke={chartTheme.npv} strokeWidth={2} dot={false} name="NPV" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AnalyticsDashboard({ result, rows }: AnalyticsDashboardProps) {
  const totalRes0 = result.totalResourceUsed[0] ?? result.totalTons;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Schedule analytics</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {result.periods} active periods (P{result.activePeriods[0]}–P
            {result.activePeriods[result.activePeriods.length - 1]}) · Resource 0 total{' '}
            {fmtTons(totalRes0)} · {result.nResources} capacity constraint
            {result.nResources === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1 — Tons by period: resource 0 + resource 1 stacked */}
        <ChartCard
          title="Tons by period"
          subtitle="Total tonnes moved each period (resource 0 & resource 1)"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rows} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => fmtTons(v)} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [fmtTons(v), name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="res0Tons" stackId="tons" fill={chartTheme.ore} name="Resource 0" />
              <Bar dataKey="res1Tons" stackId="tons" fill={chartTheme.waste} name="Resource 1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2 — Capacity resource 0 */}
        {result.nResources > 0 && <CapacityResourceChart resourceId={0} rows={rows} />}

        {/* 3 — Capacity resource 1 */}
        {result.nResources > 1 && <CapacityResourceChart resourceId={1} rows={rows} />}

        {/* Extra capacity charts if more than 2 resources */}
        {result.nResources > 2 &&
          Array.from({ length: result.nResources - 2 }, (_, i) => (
            <CapacityResourceChart key={i + 2} resourceId={i + 2} rows={rows} />
          ))}

        {/* 4 — NPV by period */}
        <ChartCard title="NPV by period" subtitle="Discounted value generated each period">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: chartTheme.axis }} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtUsdFull(v), 'NPV']} />
              <Line type="monotone" dataKey="npv" stroke={chartTheme.npv} strokeWidth={2.5} dot={{ r: 3, fill: chartTheme.npv }} name="NPV" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5 — Cumulative NPV */}
        <ChartCard title="Cumulative NPV" subtitle="Running total discounted value">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={rows}>
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

        {/* 6 — Tons vs value (resource 0) */}
        {result.nResources > 0 && <TonsVsValueChart resourceId={0} rows={rows} />}

        {/* 7 — Tons vs value (resource 1) */}
        {result.nResources > 1 && <TonsVsValueChart resourceId={1} rows={rows} />}

        {result.nResources > 2 &&
          Array.from({ length: result.nResources - 2 }, (_, i) => (
            <TonsVsValueChart key={i + 2} resourceId={i + 2} rows={rows} />
          ))}

        {/* 8 — Resource 0 intensity */}
        {result.nResources > 0 && <ResourceIntensityChart resourceId={0} rows={rows} />}

        {/* 9 — Resource 1 intensity */}
        {result.nResources > 1 && <ResourceIntensityChart resourceId={1} rows={rows} />}

        {result.nResources > 2 &&
          Array.from({ length: result.nResources - 2 }, (_, i) => (
            <ResourceIntensityChart key={i + 2} resourceId={i + 2} rows={rows} />
          ))}
      </div>
    </div>
  );
}
