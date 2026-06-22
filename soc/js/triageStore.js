const STORAGE_KEY = 'haxnation_soc_triages';

function loadTriages() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? new Map(JSON.parse(data)) : new Map();
  } catch (e) {
    return new Map();
  }
}

function saveTriages(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.entries())));
}

const triageMap = loadTriages();

export function recordTriage(key, result) {
  if (!triageMap.has(key)) {
    triageMap.set(key, result);
    saveTriages(triageMap);
  }
}

export function getScenarioTriages(scenarioId) {
  return Array.from(triageMap.values()).filter(t => t.scenarioId === scenarioId);
}

export function getTriage(key) {
  return triageMap.get(key);
}

export function clearScenarioTriages(scenarioId) {
  for (const [key, val] of triageMap.entries()) {
    if (val.scenarioId === scenarioId) {
      triageMap.delete(key);
    }
  }
  saveTriages(triageMap);
}
