const BASE = 'https://a-y-u-s-h-y-a.github.io/project-haxnation/soc-api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, res.status);
  }
  return res.json();
}

export async function listScenarios() {
  const data = await fetchJson(`${BASE}/challenges-lite.json`);
  const scenarios = data.map(c => ({
    id: c.id,
    title: c.name,
    difficulty: c.difficulty,
    tags: c.category || [],
    description: c.description || 'Access terminal to view intelligence briefing.',
    alertCount: c.alert_count !== undefined ? c.alert_count : 'MULTIPLE'
  }));
  return { scenarios };
}

export async function getScenario(id) {
  const data = await fetchJson(`${BASE}/challenges/${id}.json`);
  return {
    id: data.id,
    title: data.name,
    description: data.description,
    difficulty: data.difficulty,
    tags: data.category || [],
    alertCount: data.alert_count !== undefined ? data.alert_count : 'MULTIPLE',
    ...data
  };
}

const cachedAlerts = {};

async function fetchAndCacheAlerts(id) {
  if (cachedAlerts[id]) return;
  const chal = await getScenario(id);
  
  if (chal.assets && chal.assets.length > 0) {
    const asset = chal.assets[0];
    const cleanAsset = asset.replace('./', '');
    const folderPath = chal.repo_path || `${chal.category[0]}/${chal.name}`;
    const downloadUrl = `https://raw.githubusercontent.com/A-Y-U-S-H-Y-A/project-haxnation/main/${folderPath}/${cleanAsset}`;
    
    try {
      const alerts = await fetchJson(downloadUrl);
      cachedAlerts[id] = alerts;
    } catch (e) {
      cachedAlerts[id] = [];
      console.error("Failed to load alerts", e);
    }
  } else {
    cachedAlerts[id] = [];
  }
}

export async function getScenarioSummary(id) {
  await fetchAndCacheAlerts(id);
  const alerts = cachedAlerts[id];
  return {
    scenario: await getScenario(id),
    totalAlerts: alerts ? alerts.length : 0
  };
}

function mapAlert(raw, index) {
  return {
    ...raw,
    alert_severity: raw.alert?.severity || raw.event?.severity || raw.alert_severity || 'informational',
    _time: raw.timestamp || raw._time || 'Unknown',
    alert_name: raw.alert?.title || raw.rule?.name || raw.alert_name || 'Unknown Alert',
    source: raw.source?.product || (typeof raw.source === 'string' ? raw.source : 'Unknown'),
    host: raw.observer?.hostname || raw.observer?.name || (typeof raw.host === 'string' ? raw.host : 'Unknown'),
    _index: index
  };
}

export async function listAlerts(id, filters = {}) {
  await fetchAndCacheAlerts(id);
  let mapped = (cachedAlerts[id] || []).map(mapAlert);
  
  if (filters.severity) {
    mapped = mapped.filter(a => (a.alert_severity || '').toLowerCase() === filters.severity.toLowerCase());
  }
  if (filters.source) {
    mapped = mapped.filter(a => a.source === filters.source);
  }
  
  return { alerts: mapped };
}

export async function getAlert(scenarioId, index) {
  await fetchAndCacheAlerts(scenarioId);
  const alerts = cachedAlerts[scenarioId];
  if (!alerts || index >= alerts.length) {
    throw new ApiError('Alert not found', 404);
  }
  return mapAlert(alerts[index], index);
}

export async function submitTriage(scenarioId, index, body) {
  // Practice mode evaluates triage locally in triage.js
  return { success: true };
}
