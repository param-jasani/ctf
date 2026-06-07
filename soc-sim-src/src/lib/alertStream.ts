type Listener = (count: number, newAlertArrived: boolean) => void

let currentScenarioId: string | null = null
let visibleCount = 0
let totalCount = 0
let timerId: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<Listener>()

function notify(newAlertArrived = false) {
  listeners.forEach(cb => cb(visibleCount, newAlertArrived))
}

export function subscribeToStream(cb: Listener) {
  listeners.add(cb)
  cb(visibleCount, false)
  return () => {
    listeners.delete(cb)
  }
}

export function initScenarioStream(scenarioId: string, total: number) {
  if (currentScenarioId !== scenarioId) {
    if (timerId) clearTimeout(timerId)
    currentScenarioId = scenarioId
    visibleCount = 1 // Start with 1 as requested
    totalCount = total
    notify(false)
    scheduleNext()
  } else {
    totalCount = total
    notify(false)
  }
}

function scheduleNext() {
  if (visibleCount >= totalCount) return

  const delay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000
  timerId = setTimeout(() => {
    visibleCount += 1
    notify(true)
    scheduleNext()
  }, delay)
}

export function getVisibleCount() {
  return visibleCount
}
