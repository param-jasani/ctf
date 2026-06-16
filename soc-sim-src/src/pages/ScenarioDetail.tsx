import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getScenarioSummary, listAlerts } from '../api'
import type { Alert, AlertSeverity, ScenarioSummary } from '../types'
import { initScenarioStream, subscribeToStream } from '../lib/alertStream'
import { useTriage } from '../contexts/TriageContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TriageResult } from '../types'
import SeverityBadge from '../components/SeverityBadge'
import TerminalLoader from '../components/TerminalLoader'
import ErrorMessage from '../components/ErrorMessage'

const SEVERITIES: AlertSeverity[] = ['critical', 'high', 'medium', 'low', 'informational']

const SEV_BAR_COLORS: Record<AlertSeverity, string> = {
  critical:     'bg-error',
  high:         'bg-orange-500',
  medium:       'bg-yellow-500',
  low:          'bg-blue-500',
  informational:'bg-on-surface-variant',
}

function SummaryPanel({ summary }: { summary: ScenarioSummary }) {
  const maxSev = Math.max(...Object.values(summary.bySeverity), 1)
  const maxSrc = Math.max(...Object.values(summary.bySource), 1)

  return (
    <section className="col-span-12 md:col-span-4 border-r border-outline-variant bg-surface-container-lowest p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar h-full">
      {/* Severity chart */}
      <div>
        <h2 className="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2">
          <span className="text-primary-container">//</span> SUMMARY
        </h2>
        <div className="w-full h-[160px] border border-outline-variant relative bg-surface-container-low p-4 flex flex-col justify-end overflow-hidden">
          <div className="scanline" />
          <div className="flex items-end gap-2 h-full">
            {SEVERITIES.map(sev => {
              const count = summary.bySeverity[sev] ?? 0
              const pct = Math.round((count / maxSev) * 100)
              return (
                <div key={sev} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-[10px] font-code-sm text-on-surface-variant">
                    {count}
                  </span>
                  <div
                    className={`w-full opacity-80 border-t-2 ${SEV_BAR_COLORS[sev].replace('bg-', 'border-t-').replace('-500', '-400').replace('-400', '-400')}`}
                    style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: undefined }}
                  >
                    <div className={`w-full h-full ${SEV_BAR_COLORS[sev]} opacity-80`} />
                  </div>
                  <span className="text-[10px] font-bold shrink-0">
                    {sev === 'informational' ? 'INFO' : sev.slice(0, 4).toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* By source */}
      <div>
        <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 flex items-center gap-2">
          <span className="text-primary-container">//</span> BY SOURCE
        </h3>
        <div className="space-y-3">
          {Object.entries(summary.bySource)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([src, count]) => (
              <div key={src} className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="truncate mr-2">{src.toUpperCase()}</span>
                  <span>{count}</span>
                </div>
                <div className="h-1 w-full bg-surface-variant">
                  <div
                    className="h-full bg-primary-container"
                    style={{ width: `${Math.round((count / maxSrc) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>



      {/* Status block */}
      <div className="mt-auto border border-primary-container/20 p-4 bg-primary-container/5">
        <p className="font-code-sm text-code-sm text-primary-container leading-relaxed">
          <span className="font-bold">&gt; SCENARIO_STATUS:</span> ACTIVE<br />
          <span className="font-bold">&gt; TOTAL_ALERTS:</span> {summary.totalAlerts}<br />
          <span className="font-bold">&gt; TITLE:</span> {summary.title}
          <span className="block-cursor" />
        </p>
      </div>
    </section>
  )
}

function DashboardPanel({ triages }: { triages: TriageResult[] }) {
  if (triages.length === 0) return null;

  const total = triages.length;
  const correct = triages.filter(t => t.isCorrect).length;
  const avgAccuracy = Math.round((correct / total) * 100);
  
  const validTimes = triages.map(t => t.timeToRespondMs || 0).filter(t => t > 0);
  const mttr = validTimes.length ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 0;
  const bestTtr = validTimes.length ? Math.min(...validTimes) : 0;
  const worstTtr = validTimes.length ? Math.max(...validTimes) : 0;

  const formatMs = (ms: number) => (ms / 1000).toFixed(1) + 's';

  let c = 0;
  const chartData = [...triages].sort((a,b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()).map((t, i) => {
    c += t.isCorrect ? 1 : 0;
    return { name: `A${i+1}`, accuracy: Math.round((c / (i + 1)) * 100) };
  });

  return (
    <div className="p-6 bg-surface-container border-b border-outline-variant space-y-6 shrink-0">
      <h2 className="font-label-caps text-label-caps text-primary flex items-center gap-2">
        <span className="material-symbols-outlined">analytics</span>
        // SCENARIO COMPLETE: POST-INCIDENT REPORT
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['AVG ACCURACY', `${avgAccuracy}%`],
          ['MTTR', formatMs(mttr)],
          ['BEST TTR', formatMs(bestTtr)],
          ['WORST TTR', formatMs(worstTtr)],
        ].map(([k, v]) => (
          <div key={k} className="p-4 border border-outline-variant bg-surface-container-low flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] text-on-surface-variant font-bold">{k}</span>
            <span className="text-xl font-headline-md text-primary-container">{v}</span>
          </div>
        ))}
      </div>

      <div className="h-64 border border-outline-variant bg-surface-container-lowest p-4 flex flex-col">
        <h3 className="text-[10px] text-on-surface-variant font-bold mb-4">// ACCURACY TREND</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
              <Line type="monotone" dataKey="accuracy" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: '#38bdf8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function AlertTable({
  alerts,
  scenarioId,
  filters,
  onFilterChange,
  allSources,
  isDone,
  triages,
}: {
  alerts: (Alert & { _index: number })[]
  scenarioId: string
  filters: { severity: string; source: string }
  onFilterChange: (key: string, val: string) => void
  allSources: string[]
  isDone: boolean
  triages: TriageResult[]
}) {
  const navigate = useNavigate()

  return (
    <section className="col-span-12 md:col-span-8 flex flex-col bg-background h-full overflow-hidden">
      {/* Filter bar */}
      <div className="h-14 border-b border-outline-variant flex items-center px-6 gap-4 bg-surface-container-low shrink-0">
        <h2 className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2 shrink-0">
          <span className="text-primary-container">//</span> ALERTS ({alerts.length})
        </h2>
        <div className="h-4 w-px bg-outline-variant" />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity filter */}
          <select
            value={filters.severity}
            onChange={e => onFilterChange('severity', e.target.value)}
            className="px-3 py-1 bg-surface-variant text-on-surface font-code-sm text-code-sm border-none focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
          >
            <option value="">SEVERITY: ALL</option>
            {['informational', 'low', 'medium', 'high', 'critical'].map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
          {/* Source filter */}
          <select
            value={filters.source}
            onChange={e => onFilterChange('source', e.target.value)}
            className="px-3 py-1 bg-surface-variant text-on-surface font-code-sm text-code-sm border-none focus:outline-none focus:ring-1 focus:ring-primary-container cursor-pointer"
          >
            <option value="">SOURCE: ALL</option>
            {allSources.map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto flex flex-col">
        {isDone && <DashboardPanel triages={triages} />}
        
        {/* Table */}
        <div className="flex-1">
        {isDone ? (
          <div className="flex flex-col items-center justify-center h-64 text-primary opacity-80">
            <span className="material-symbols-outlined text-[48px]">check_circle</span>
            <p className="font-label-caps text-label-caps mt-2">// ALL ALERTS RESOLVED. SYSTEM SECURE.</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant opacity-40">
            <span className="material-symbols-outlined text-[48px]">filter_alt_off</span>
            <p className="font-label-caps text-label-caps mt-2">// NO ALERTS MATCH ACTIVE FILTERS</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-surface-container-high z-10">
              <tr className="border-b border-outline-variant">
                {['_TIME', 'ALERT_NAME', 'SEV', 'SOURCE', 'HOST', ''].map(h => (
                  <th key={h} className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {alerts.map(alert => (
                <tr
                  key={alert._index}
                  className="hover:bg-surface-container-low transition-colors group cursor-pointer active:bg-primary-container/10"
                  onClick={() => navigate(`/scenarios/${scenarioId}/alerts/${alert._index}`)}
                >
                  <td className="px-4 py-4 font-code-sm text-code-sm text-on-surface-variant whitespace-nowrap">
                    {alert._time.split('T')[1]?.replace('Z', '') ?? alert._time}
                  </td>
                  <td className="px-4 py-4 font-body-lg text-body-lg max-w-[260px] whitespace-normal break-words">
                    <span>{alert.alert_name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <SeverityBadge severity={alert.alert_severity} />
                  </td>
                  <td className="px-4 py-4 font-code-sm text-code-sm text-on-surface-variant whitespace-nowrap">
                    {alert.source}
                  </td>
                  <td className="px-4 py-4 font-code-sm text-code-sm text-on-surface-variant whitespace-nowrap">
                    {alert.host}
                  </td>
                  <td className="px-4 py-4">
                    <span className="material-symbols-outlined text-primary-container opacity-0 group-hover:opacity-100 transition-opacity text-[18px]">
                      open_in_new
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Footer */}
      <footer className="h-8 border-t border-outline-variant bg-surface-container-lowest flex items-center px-6 justify-between shrink-0">
        <div className="flex gap-4 items-center">
          <span className="text-[9px] font-bold text-on-surface-variant tracking-widest">SYSTEM_OK</span>
        </div>
        <span className="text-[9px] font-bold text-on-surface-variant">
          SHOWING {alerts.length} ALERTS
        </span>
      </footer>
    </section>
  )
}

export default function ScenarioDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<ScenarioSummary | null>(null)
  const [alerts, setAlerts] = useState<(Alert & { _index: number })[]>([])
  const [allAlerts, setAllAlerts] = useState<(Alert & { _index: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ severity: '', source: '' })
  const [visibleCount, setVisibleCount] = useState(0)
  const [toastMsg, setToastMsg] = useState('')
  const { getScenarioTriages } = useTriage()

  // Unique source values from the UNFILTERED alert set
  const allSources = [...new Set(allAlerts.map(a => a.source))].sort()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      getScenarioSummary(id),
      listAlerts(id),
    ])
      .then(([sum, res]) => {
        setSummary(sum)
        setAlerts(res.alerts)
        setAllAlerts(res.alerts)
        initScenarioStream(id, res.alerts.length)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load scenario')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    const unsub = subscribeToStream((count, isNew) => {
      setVisibleCount(count)
      if (isNew) {
        setToastMsg('NEW ALERT DETECTED')
        setTimeout(() => setToastMsg(''), 3000)
      }
    })
    return unsub
  }, [])

  // Re-fetch when filters change
  useEffect(() => {
    if (!id || loading) return
    const active = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    ) as { severity?: string; source?: string }

    if (Object.keys(active).length === 0) {
      setAlerts(allAlerts)
      return
    }
    listAlerts(id, active)
      .then(res => setAlerts(res.alerts))
      .catch(() => {/* silently show previous results */})
  }, [filters, id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterChange(key: string, val: string) {
    setFilters(prev => ({ ...prev, [key]: val }))
  }

  const triagedIndices = new Set(getScenarioTriages(id!).map(t => t.alertIndex))
  const visibleAlerts = alerts
    .filter(a => a._index < visibleCount)
    .filter(a => !triagedIndices.has(a._index))
    .sort((a, b) => b._index - a._index)

  const streamedAlerts = alerts.filter(a => a._index < visibleCount)
  const computedSummary: ScenarioSummary | null = summary ? {
    ...summary,
    totalAlerts: visibleCount,
    bySeverity: streamedAlerts.reduce((acc, a) => {
      acc[a.alert_severity] = (acc[a.alert_severity] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    bySource: streamedAlerts.reduce((acc, a) => {
      acc[a.source] = (acc[a.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <TerminalLoader text="LOADING SCENARIO DATA" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-margin">
        <ErrorMessage message={error} />
        <button onClick={() => navigate('/scenarios')} className="mt-4 font-label-caps text-label-caps text-primary-container hover:text-primary">
          ← BACK TO SCENARIOS
        </button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-48px)] grid grid-cols-12 overflow-hidden relative">
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary-container px-6 py-2 font-label-caps text-label-caps z-50 animate-bounce flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">notifications_active</span>
          {toastMsg}
        </div>
      )}
      {computedSummary && <SummaryPanel summary={computedSummary} />}
      <AlertTable
        alerts={visibleAlerts}
        scenarioId={id!}
        filters={filters}
        onFilterChange={handleFilterChange}
        allSources={allSources}
        isDone={summary !== null && visibleCount === summary.totalAlerts && getScenarioTriages(id!).length === summary.totalAlerts}
        triages={getScenarioTriages(id!)}
      />
    </div>
  )
}
