const BASE = 'https://api.haxnation.org/ctf/soc-sim';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  let body = {};
  try {
    body = await res.json();
  } catch (e) {
    // Ignore JSON parse errors for empty responses
  }
  if (!res.ok) {
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status);
  }
  return body;
}

export async function listScenarios() {
  return req('/scenarios');
}

export async function getScenario(id) {
  return req(`/scenarios/${id}`);
}

export async function getScenarioSummary(id) {
  return req(`/scenarios/${id}/summary`);
}

export async function listAlerts(id, filters = {}) {
  const params = new URLSearchParams();
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.source) params.set('source', filters.source);
  if (filters.mitre_tactic) params.set('mitre_tactic', filters.mitre_tactic);
  const qs = params.toString();
  return req(`/scenarios/${id}/alerts${qs ? `?${qs}` : ''}`);
}

export async function getAlert(scenarioId, index) {
  return req(`/scenarios/${scenarioId}/alerts/${index}`);
}

export async function submitTriage(scenarioId, index, body) {
  return req(`/scenarios/${scenarioId}/alerts/${index}/triage`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
