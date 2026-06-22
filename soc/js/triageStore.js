const triageMap = new Map();

export function recordTriage(key, result) {
  if (!triageMap.has(key)) {
    triageMap.set(key, result);
  }
}

export function getScenarioTriages(scenarioId) {
  return Array.from(triageMap.values()).filter(t => t.scenarioId === scenarioId);
}

export function getTriage(key) {
  return triageMap.get(key);
}
