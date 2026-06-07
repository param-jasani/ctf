import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAlert, getScenarioSummary } from '../api'
import type { Alert, AlertSeverity, TriageResult, TriageVerdict } from '../types'
import SeverityBadge from '../components/SeverityBadge'
import TerminalLoader from '../components/TerminalLoader'
import ErrorMessage from '../components/ErrorMessage'

// Fields that carry no analyst-facing meaning
const SKIP_FIELDS = new Set(['index', 'sourcetype', 'status', '_index', 'alert_name', 'alert_severity', 'source', 'host', '_time', 'mitre_tactic', 'mitre_technique'])

interface VerdictOption {
  value: TriageVerdict
  label: string
  hoverBorder: string
  hoverBg: string
  selectedBorder: string
  selectedBg: string
}

const VERDICTS: VerdictOption[] = [
  {
    value: 'true_positive',
    label: 'TRUE_POSITIVE',
    hoverBorder:    'hover:border-primary-container',
    hoverBg:        'hover:bg-primary-container/5',
    selectedBorder: 'border-primary-container',
    selectedBg:     'bg-primary-container/10',
  },
  {
    value: 'false_positive',
    label: 'FALSE_POSITIVE',
    hoverBorder:    'hover:border-on-surface-variant',
    hoverBg:        'hover:bg-surface-variant',
    selectedBorder: 'border-on-surface-variant',
    selectedBg:     'bg-surface-variant',
  },
]

function JsonViewer({ data, name, initialExpanded = false }: { data: any; name?: string; initialExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const isObject = typeof data === 'object' && data !== null
  const isArray = Array.isArray(data)

  if (!isObject) {
    return (
      <div className="flex gap-2">
        {name && <span className="text-on-surface-variant shrink-0">{name}:</span>}
        <span className="text-primary break-all">{String(data)}</span>
      </div>
    )
  }

  const keys = Object.keys(data).filter(k => !k.toLowerCase().includes('verdict'))
  const isEmpty = keys.length === 0

  return (
    <div className="font-code-sm text-code-sm">
      <div 
        className="cursor-pointer hover:bg-surface-variant inline-flex items-center gap-1 select-none text-primary-container py-0.5 px-1 -ml-1 transition-colors"
        onClick={() => !isEmpty && setExpanded(!expanded)}
      >
        <span className={`material-symbols-outlined text-[14px] transition-transform ${expanded ? 'rotate-90' : ''} ${isEmpty ? 'opacity-0' : 'opacity-70'}`}>
          chevron_right
        </span>
        {name && <span className="text-on-surface-variant">{name}: </span>}
        <span className="text-on-surface-variant/70 italic">
          {isArray ? `[${keys.length} items]` : `{${keys.length} keys}`}
        </span>
      </div>
      {expanded && !isEmpty && (
        <div className="pl-4 border-l border-outline-variant/30 ml-1.5 mt-0.5 space-y-0.5">
          {keys.map(key => (
            <div key={key}>
              <JsonViewer data={data[key as keyof typeof data]} name={isArray ? undefined : key} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertFieldsPanel({ alert }: { alert: Alert & { _index: number } }) {
  const [cmdExpanded, setCmdExpanded] = useState(false)

  const displayFields = Object.entries(alert).filter(([key, val]) => {
    if (SKIP_FIELDS.has(key)) return false
    if (val === null || val === undefined || val === '') return false
    if (key === 'mitre_technique' || key === 'mitre_tactic') return false
    if (key.toLowerCase().includes('verdict')) return false
    return true
  })

  return (
    <div className="space-y-[1px] bg-outline-variant">
      {displayFields.map(([key, val]) => {
        let parsedData = null
        let isJson = false
        if (typeof val === 'object' && val !== null) {
          isJson = true
          parsedData = val
        } else if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val)
            if (typeof parsed === 'object' && parsed !== null) {
              isJson = true
              parsedData = parsed
            }
          } catch (e) {
            // ignore
          }
        }

        const isCmdline = key === 'cmdline'
        const strVal = String(val)

        return (
          <div key={key} className="grid grid-cols-3 bg-surface-container-lowest p-3 items-start">
            <span className="font-code-sm text-code-sm text-on-surface-variant">{key}</span>
            {isJson ? (
              <div className="col-span-2 overflow-x-auto bg-black/20 p-2 border border-outline-variant/30">
                <JsonViewer data={parsedData} initialExpanded={true} />
              </div>
            ) : isCmdline ? (
              <div className="col-span-2 bg-black/40 p-3 border border-outline-variant">
                <code className="font-code-sm text-code-sm text-primary-container break-all block">
                  {cmdExpanded ? strVal : strVal.slice(0, 120)}
                  {strVal.length > 120 && !cmdExpanded && '…'}
                </code>
                {strVal.length > 120 && (
                  <button
                    onClick={() => setCmdExpanded(x => !x)}
                    className="mt-2 text-[10px] text-on-surface-variant hover:text-primary-container transition-colors"
                  >
                    {cmdExpanded ? '// COLLAPSE' : '// EXPAND FULL PAYLOAD'}
                  </button>
                )}
                <div className="mt-2 text-[10px] text-on-surface-variant italic">// ENCODED PAYLOAD DETECTED</div>
              </div>
            ) : (
              <span className="col-span-2 font-code-sm text-code-sm text-primary break-all">{strVal}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}





function TriagePanel({
  scenarioId,
  alert,
  totalAlerts,
  existing,
  onSubmit,
}: {
  scenarioId: string
  alert: Alert & { _index: number }
  totalAlerts: number
  existing: (TriageResult & { isCorrect?: boolean }) | undefined
  onSubmit: (result: TriageResult & { isCorrect: boolean }) => void
}) {
  const navigate = useNavigate()
  const [verdict, setVerdict] = useState<TriageVerdict | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit() {
    if (!verdict) return
    setSubmitting(true)
    setSubmitError('')
    
    // Find the ground truth verdict from the alert fields
    let actualVerdict = ''
    for (const val of Object.values(alert)) {
      if (typeof val === 'string') {
        try { const p = JSON.parse(val); if (p?.verdict) actualVerdict = p.verdict; } catch(e){}
      } else if (val && typeof val === 'object') {
        if ((val as any).verdict) actualVerdict = (val as any).verdict;
      }
    }

    setTimeout(() => {
      setSubmitting(false)
      const isCorrect = actualVerdict ? verdict === actualVerdict : true
      onSubmit({ 
        scenarioId,
        alertIndex: alert._index,
        alertName: alert.alert_name,
        verdict, 
        submittedAt: new Date().toISOString(), 
        isCorrect 
      })
      
      const isLast = alert._index >= totalAlerts - 1
      if (!isLast) {
        setTimeout(() => {
          navigate(`/scenarios/${scenarioId}/alerts/${alert._index + 1}`)
        }, 1500)
      }
    }, 400)
  }

  if (existing) {
    const isLast = alert._index >= totalAlerts - 1
    return (
      <div className="border border-primary-container/30 bg-surface-container p-6 space-y-6">
        <h2 className="font-label-caps text-label-caps text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          // TRIAGE SUBMITTED
        </h2>
        <div className="space-y-[1px] bg-outline-variant">
          {[
            ['verdict',   alert.alert_severity === 'informational'
                            ? (existing.verdict === 'true_positive' ? 'MALICIOUS' : 'NON-MALICIOUS')
                            : existing.verdict.toUpperCase()],
            ['submitted', existing.submittedAt.split('T')[0]],
            ['accuracy', existing.isCorrect === undefined ? 'UNKNOWN' : existing.isCorrect ? 'CORRECT' : 'INCORRECT']
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 bg-surface-container-lowest p-3">
              <span className="font-code-sm text-code-sm text-on-surface-variant">{k}</span>
              <span className={`col-span-2 font-code-sm text-code-sm ${k === 'accuracy' ? (existing.isCorrect ? 'text-[#00ff88]' : 'text-error') : 'text-primary-container'}`}>{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate(isLast ? `/scenarios/${scenarioId}` : `/scenarios/${scenarioId}/alerts/${alert._index + 1}`)}
          className="w-full h-12 bg-primary-container text-on-primary-container font-label-caps text-label-caps hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2"
        >
          {isLast ? 'BACK TO SCENARIO' : <>NEXT ALERT <span className="material-symbols-outlined text-[16px]">chevron_right</span></>}
        </button>
      </div>
    )
  }

  return (
    <section className="border border-primary-container/30 bg-surface-container p-6">
      <h2 className="font-label-caps text-label-caps text-primary mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-container text-[18px]">security</span>
        // TRIAGE ACTION
      </h2>
      <div className="space-y-4">
        {/* Verdict grid */}
        <div className="grid grid-cols-2 gap-2">
          {VERDICTS.map(opt => {
            const selected = verdict === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setVerdict(opt.value)}
                className={[
                  'h-12 border transition-all font-label-caps text-label-caps flex flex-col items-center justify-center p-2',
                  selected
                    ? `${opt.selectedBorder} ${opt.selectedBg} text-on-surface`
                    : `border-outline-variant ${opt.hoverBorder} ${opt.hoverBg} text-on-surface`,
                ].join(' ')}
              >
                {alert.alert_severity === 'informational'
                  ? (opt.value === 'true_positive' ? 'MALICIOUS' : 'NON-MALICIOUS')
                  : opt.label}
              </button>
            )
          })}
        </div>

        {submitError && <ErrorMessage message={submitError} />}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!verdict || submitting}
          className="w-full h-14 bg-primary-container text-on-primary-container font-headline-md text-headline-md font-bold uppercase hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>SUBMITTING<span className="block-cursor" /></>
          ) : (
            <>SUBMIT TRIAGE <span className="material-symbols-outlined">send</span></>
          )}
        </button>
      </div>
    </section>
  )
}

export default function AlertTriage() {
  const { id, index } = useParams<{ id: string; index: string }>()
  const navigate = useNavigate()

  const alertIndex = parseInt(index ?? '0', 10)
  const triageKey = `${id}:${alertIndex}`

  const [alert, setAlert] = useState<(Alert & { _index: number }) | null>(null)
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [triageMap, setTriageMap] = useState<Map<string, TriageResult & { isCorrect?: boolean }>>(new Map())

  const recordTriage = (k: string, v: TriageResult & { isCorrect?: boolean }) => {
    setTriageMap(prev => new Map(prev).set(k, v))
  }

  useEffect(() => {
    if (!id || isNaN(alertIndex)) return
    setLoading(true)
    setAlert(null)
    Promise.all([
      getAlert(id, alertIndex),
      getScenarioSummary(id),
    ])
      .then(([a, s]) => {
        setAlert(a)
        setTotalAlerts(s.totalAlerts)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load alert')
      })
      .finally(() => setLoading(false))
  }, [id, alertIndex, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <TerminalLoader text="LOADING ALERT DATA" />
      </div>
    )
  }

  if (error || !alert) {
    return (
      <div className="p-margin">
        <ErrorMessage message={error || 'Alert not found'} />
        <button onClick={() => navigate(`/scenarios/${id}`)} className="mt-4 font-label-caps text-label-caps text-primary-container hover:text-primary">
          ← BACK TO SCENARIO
        </button>
      </div>
    )
  }

  const existing = triageMap.get(triageKey)

  return (
    <div className="min-h-[calc(100vh-48px)] bg-background pb-12">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-margin pt-6 pb-4 gap-4 border-b border-outline-variant">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/scenarios/${id}`)}
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-label-caps"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            BACK TO SCENARIO
          </button>
          <div className="h-4 w-px bg-outline-variant" />
          <span className="font-label-caps text-label-caps text-primary tracking-widest">
            ALERT {alertIndex + 1} / {totalAlerts}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={alertIndex <= 0}
            onClick={() => navigate(`/scenarios/${id}/alerts/${alertIndex - 1}`)}
            className="px-4 py-2 bg-surface-container-high border border-outline-variant hover:border-primary text-on-surface font-label-caps text-label-caps flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            PREV
          </button>
          <button
            disabled={alertIndex >= totalAlerts - 1}
            onClick={() => navigate(`/scenarios/${id}/alerts/${alertIndex + 1}`)}
            className="px-4 py-2 bg-surface-container-high border border-outline-variant hover:border-primary text-on-surface font-label-caps text-label-caps flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            NEXT
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Alert title section */}
      <div
        className={[
          'mx-margin mt-8 mb-8 pl-6',
          alert.alert_severity === 'critical'     ? 'severity-stripe-critical' :
          alert.alert_severity === 'high'         ? 'severity-stripe-high' :
          alert.alert_severity === 'medium'       ? 'severity-stripe-medium' :
          alert.alert_severity === 'low'          ? 'severity-stripe-low' :
                                                    'severity-stripe-info',
        ].join(' ')}
      >
        <h1 className="font-headline-lg text-headline-lg text-primary leading-tight mb-2">
          &gt; {alert.alert_name}
          <span className="block-cursor" />
        </h1>
        <div className="flex flex-wrap gap-4 items-center mt-2">
          <div className="flex items-center gap-2 bg-error-container/20 px-2 py-1 border border-error/30">
            <span className="font-label-caps text-label-caps text-error">
              SEVERITY: [<SeverityBadge severity={alert.alert_severity as AlertSeverity} variant="text" />]
            </span>
          </div>
          <div className="text-on-surface-variant font-code-sm text-code-sm uppercase">
            SOURCE: <span className="text-primary-container">{alert.source}</span>
          </div>
          <div className="text-on-surface-variant font-code-sm text-code-sm uppercase">
            HOST: <span className="text-primary-container">{alert.host}</span>
          </div>
          <div className="text-on-surface-variant font-code-sm text-code-sm uppercase flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {alert._time}
          </div>
        </div>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-margin">
        {/* Left: details */}
        <div className="lg:col-span-8 space-y-8">
          {/* Alert fields */}
          <section>
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-2">
              <h2 className="font-label-caps text-label-caps text-primary tracking-tighter">// ALERT FIELDS</h2>
              <span className="text-[10px] text-on-surface-variant">HEX_DUMP_ENABLED: TRUE</span>
            </div>
            <AlertFieldsPanel alert={alert} />
          </section>




        </div>

        {/* Right: triage */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <TriagePanel
              scenarioId={id!}
              alert={alert}
              totalAlerts={totalAlerts}
              existing={existing}
              onSubmit={result => recordTriage(triageKey, result)}
            />
          </div>
        </div>
      </div>

      {/* Fixed status bar */}
      <footer className="fixed bottom-0 left-0 w-full h-6 bg-surface-container-lowest border-t border-outline-variant px-margin flex items-center justify-between text-[10px] z-50">
        <div className="flex items-center gap-4">
          <span className="text-primary-container flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            SYSTEM: STABLE
          </span>
          <span className="text-on-surface-variant">ENCRYPTION: AES-256</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-on-surface-variant">SIGNATURE: {alert.signature}</span>
          <span className="text-primary-container">OS: CORE_SURVEILLANCE_v4.2</span>
        </div>
      </footer>
    </div>
  )
}
