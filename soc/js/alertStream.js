const STREAM_KEY = 'haxnation_soc_streams';

function loadStreamCounts() {
  try {
    const data = localStorage.getItem(STREAM_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveStreamCounts(counts) {
  localStorage.setItem(STREAM_KEY, JSON.stringify(counts));
}

const streamCounts = loadStreamCounts();

let currentScenarioId = null;
let totalCount = 0;
let timerId = null;
const listeners = new Set();

function getVisible() {
  return streamCounts[currentScenarioId] || 1;
}

function notify(newAlertArrived = false) {
  listeners.forEach(cb => cb(getVisible(), newAlertArrived));
}

export function subscribeToStream(cb) {
  listeners.add(cb);
  cb(getVisible(), false);
  return () => {
    listeners.delete(cb);
  };
}

export function initScenarioStream(scenarioId, total) {
  if (currentScenarioId !== scenarioId) {
    if (timerId) clearTimeout(timerId);
    currentScenarioId = scenarioId;
    totalCount = total;
    
    if (!streamCounts[scenarioId]) {
      streamCounts[scenarioId] = 1;
      saveStreamCounts(streamCounts);
    }
    
    notify(false);
    scheduleNext();
  } else {
    totalCount = total;
    notify(false);
  }
}

function scheduleNext() {
  if (getVisible() >= totalCount) return;

  const delay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
  timerId = setTimeout(() => {
    streamCounts[currentScenarioId] = getVisible() + 1;
    saveStreamCounts(streamCounts);
    notify(true);
    scheduleNext();
  }, delay);
}

export function getVisibleCount() {
  return getVisible();
}

export function resetScenarioStream(scenarioId) {
  streamCounts[scenarioId] = 1;
  saveStreamCounts(streamCounts);
  if (currentScenarioId === scenarioId) {
    if (timerId) clearTimeout(timerId);
    notify(false);
    scheduleNext();
  }
}
