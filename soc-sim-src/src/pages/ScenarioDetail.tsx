import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getScenarioSummary, listAlerts } from '../api'
import type { Alert, AlertSeverity, ScenarioSummary } from '../types'
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

function AlertTable({
  alerts,
  scenarioId,
  filters,
  onFilterChange,
  allSources,
}: {
  alerts: (Alert & { _index: number })[]
  scenarioId: string
  filters: { severity: string; source: string }
  onFilterChange: (key: string, val: string) => void
  allSources: string[]
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {alerts.length === 0 ? (
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
                  <td className="px-4 py-4 font-body-lg text-body-lg max-w-[260px]">
                    <span className="line-clamp-1">{alert.alert_name}</span>
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
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load scenario')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

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

  const computedSummary: ScenarioSummary | null = summary ? {
    ...summary,
    totalAlerts: alerts.length,
    bySeverity: alerts.reduce((acc, a) => {
      acc[a.alert_severity] = (acc[a.alert_severity] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    bySource: alerts.reduce((acc, a) => {
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
    <div className="h-[calc(100vh-48px)] grid grid-cols-12 overflow-hidden">
      {computedSummary && <SummaryPanel summary={computedSummary} />}
      <AlertTable
        alerts={alerts}
        scenarioId={id!}
        filters={filters}
        onFilterChange={handleFilterChange}
        allSources={allSources}
      />
    </div>
  )
}
