export type AlertSeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical'

export type TriageVerdict =
  | 'true_positive'
  | 'false_positive'

export interface Alert {
  _time: string
  index: string
  sourcetype: string
  source: string
  host: string
  alert_name: string
  alert_severity: AlertSeverity
  status: string
  src_ip?: string
  src_host?: string
  src_user?: string
  dest_ip?: string
  dest_host?: string
  dest_port?: string
  url?: string
  app?: string
  process?: string
  parent_process?: string
  process_hash_sha256?: string
  cmdline?: string
  mitre_technique?: string | null
  mitre_tactic?: string | null
  rule_description: string
  signature: string
  count: string
  _index?: number
  [key: string]: unknown
}

export interface ScenarioMeta {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  alertCount: number
}

export interface Scenario extends ScenarioMeta {
  alerts: Alert[]
}

export interface ScenarioSummary {
  scenarioId: string
  title: string
  totalAlerts: number
  bySeverity: Record<string, number>
  bySource: Record<string, number>
  byMitreTactic: Record<string, number>
}

export interface AlertsResponse {
  scenarioId: string
  count: number
  alerts: (Alert & { _index: number })[]
}

export interface TriageSubmission {
  verdict: TriageVerdict
  notes?: string
}

export interface TriageResult {
  scenarioId: string;
  alertIndex: number;
  alertName: string;
  verdict: TriageVerdict;
  notes?: string;
  submittedAt: string;
}

export interface TriageResponse {
  message: string
  triage: TriageResult
}
