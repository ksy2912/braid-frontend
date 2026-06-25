import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BarChart3, FileJson, Loader2, FolderOpen } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StepNav } from '../components/layout/StepNav';
import { useAppContext } from '../context/AppContext';
import { loadVerificationDataset, VERIFICATION_DATASET } from '../lib/dataset';

export function UploadPage() {
  const navigate = useNavigate();
  const { setSolverResult } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoadDataset = useCallback(() => {
    setError(null);
    setIsProcessing(true);
    try {
      const result = loadVerificationDataset();
      setSolverResult(result);
      navigate('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification dataset');
      setIsProcessing(false);
    }
  }, [navigate, setSolverResult]);

  return (
    <div className="min-h-screen bg-app">
      <PageHeader
        title="Frontend Verification"
        subtitle="Load manager solution JSON from dataset/ and render analytics charts (no Python backend)."
        step={1}
        totalSteps={2}
      />
      <StepNav currentStep={1} />

      <main className="page-shell w-full py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          {error && (
            <div className="panel flex items-start gap-3 border-red-200 bg-red-50/50 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Load failed</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="panel-elevated p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--navy)] text-white">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {VERIFICATION_DATASET.label} verification bundle
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Schedule comes from the manager&apos;s JSON output. PCPSP file supplies limits, masses, and
              objective values for chart aggregation only — <strong>main.py is not run</strong>.
            </p>

            <ul className="mt-5 space-y-2 font-mono text-xs text-[var(--text-muted)]">
              <li className="flex items-center gap-2">
                <FileJson className="h-3.5 w-3.5" /> dataset/{VERIFICATION_DATASET.solution}
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="h-3.5 w-3.5" /> dataset/{VERIFICATION_DATASET.pcpsp}
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="h-3.5 w-3.5" /> dataset/{VERIFICATION_DATASET.prec}
              </li>
            </ul>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleLoadDataset}
              className="btn-primary mt-8 inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading charts…
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" /> Load dataset &amp; view charts
                </>
              )}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Schedule source</p>
              <p className="mt-1 text-sm font-semibold">Manager JSON</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Metadata source</p>
              <p className="mt-1 text-sm font-semibold">PCPSP file</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Backend</p>
              <p className="mt-1 text-sm font-semibold">Not required</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
