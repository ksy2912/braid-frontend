import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  Calendar,
  Percent,
  Activity,
  Box,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StepNav } from '../components/layout/StepNav';
import { AnalyticsDashboard } from '../components/results/AnalyticsDashboard';
import { OutputJsonPanel } from '../components/results/OutputJsonPanel';
import { BlockViewer } from '../components/results/BlockViewer'; // Imports our new 3D system
import { useAppContext } from '../context/AppContext';
import { buildPeriodRows, summaryInsights, fmtTons } from '../lib/analytics/chartData';

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof TrendingUp;
  variant?: 'default' | 'copper' | 'green' | 'slate';
}) {
  return (
    <div className={`kpi-card ${variant !== 'default' ? variant : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-4 w-4 text-[var(--text-muted)]" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { solverResult, setSolverResult } = useAppContext();
  
  // New Interactive Timeline Slicing Horizon State
  const [activePeriodFilter, setActivePeriodFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!solverResult) navigate('/');
  }, [solverResult, navigate]);

  const rows = useMemo(
    () => (solverResult ? buildPeriodRows(solverResult) : []),
    [solverResult]
  );
  const insights = useMemo(
    () => (solverResult ? summaryInsights(rows, solverResult) : null),
    [rows, solverResult]
  );

  if (!solverResult || !insights) return null;

  const {
    name,
    totalNpv,
    periods,
    discountRate,
    output,
    fileNames,
    engine,
  } = solverResult;

  return (
    <div className="min-h-screen bg-app">
      <PageHeader
        title={name || 'Mine schedule'}
        subtitle={`${fileNames.pcpsp} · ${fileNames.prec} · ${engine}`}
        step={2}
        totalSteps={2}
      />
      <StepNav currentStep={2} />

      <main className="page-shell w-full space-y-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              Peak capacity: {insights.peakPeriod} ({fmtTons(insights.peakCapacity)})
            </span>
            
            {/* Conditional Slicing Controller UI — Only renders if optional coordinates exist */}
            {solverResult.coordinates && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <label className="text-xs font-medium text-[var(--text-muted)]">3D View Target:</label>
                <select 
                  value={activePeriodFilter}
                  onChange={(e) => setActivePeriodFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2 py-1 text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Entire Pit Structure</option>
                  {rows.map((r, i) => (
                    <option key={i} value={r.periodNum}>Period {r.periodNum}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setSolverResult(null); navigate('/'); }} className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
              <RotateCcw className="h-4 w-4" /> New run
            </button>
            <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>

        {/* Optional 3D Voxel Engine Canvas Viewport Integration */}
        {solverResult.coordinates && (
          <div className="panel p-5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl animate-fade-up">
            <div className="flex items-center gap-2 mb-4">
              <Box className="h-4 w-4 text-[var(--copper)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">3D Open-Pit Block Model Spatializer</h3>
            </div>
            <BlockViewer result={solverResult} selectedPeriod={activePeriodFilter} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            label="Total NPV"
            value={`$${totalNpv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="Discounted mine value"
            icon={TrendingUp}
          />
          <KpiCard
            label="Planning horizon"
            value={`${periods} periods`}
            sub={`Best NPV in ${insights.topNpvPeriod}`}
            icon={Calendar}
            variant="slate"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel flex items-center gap-4 p-4">
            <Activity className="h-8 w-8 text-[var(--navy)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Discount rate</p>
              <p className="text-lg font-semibold">{(discountRate * 100).toFixed(1)}%</p>
            </div>
          </div>
          <div className="panel flex items-center gap-4 p-4">
            <Percent className="h-8 w-8 text-[var(--copper)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Output records</p>
              <p className="text-lg font-semibold">{output.length.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <AnalyticsDashboard result={solverResult} rows={rows} />

        <OutputJsonPanel output={output} fileName={`${name || 'schedule'}_output.json`} />
      </main>
    </div>
  );
}