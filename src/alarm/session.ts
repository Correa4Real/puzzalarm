// internal — absolute paths
import type { Alarm } from '@/types'
import { loadJSON, saveJSON } from '@/storage'

// ===== CONFIGURATIONS =====
const FIRE_WINDOW_MS = 5 * 60_000
const StorageKey = 'handled_occurrences'

// ===== STATE =====
let handledOccurrences = new Map<string, number>()
let loaded = false

// ===== UTILITIES =====
const persist = (): void => {
  const entries: Record<string, number> = {}
  const cutoff = Date.now() - FIRE_WINDOW_MS * 2
  for (const [id, at] of handledOccurrences) {
    if (at >= cutoff) entries[id] = at
  }
  handledOccurrences = new Map(Object.entries(entries))
  saveJSON(StorageKey, entries)
}

const ensureLoaded = async (): Promise<void> => {
  if (loaded) return
  loaded = true
  const stored = await loadJSON<Record<string, number>>(StorageKey)
  if (!stored) return
  const cutoff = Date.now() - FIRE_WINDOW_MS * 2
  for (const [id, at] of Object.entries(stored)) {
    if (typeof at === 'number' && at >= cutoff) handledOccurrences.set(id, at)
  }
}

const scheduledOccurrence = (alarm: Alarm, from = Date.now()): number => {
  if (alarm.oneShotAt !== undefined) return alarm.oneShotAt
  const date = new Date(from)
  date.setHours(alarm.hour, alarm.minute, 0, 0)
  return date.getTime()
}

const dueOccurrence = (alarm: Alarm, from = Date.now()): number | null => {
  if (!alarm.enabled) return null

  if (alarm.oneShotAt !== undefined) {
    if (alarm.oneShotAt <= from && from - alarm.oneShotAt < FIRE_WINDOW_MS) return alarm.oneShotAt
    return null
  }

  const at = scheduledOccurrence(alarm, from)
  if (at > from || from - at >= FIRE_WINDOW_MS) return null
  if (alarm.days.length === 0) return at
  if (alarm.days.includes(new Date(from).getDay())) return at
  return null
}

const isOccurrenceHandled = (alarmId: string, at: number): boolean => {
  const handledAt = handledOccurrences.get(alarmId)
  return handledAt !== undefined && handledAt >= at
}

const markOccurrenceHandled = (alarmId: string, at: number): void => {
  const previous = handledOccurrences.get(alarmId) ?? 0
  if (at > previous) {
    handledOccurrences.set(alarmId, at)
    persist()
  }
}

const clearHandledOccurrence = (alarmId: string): void => {
  if (!handledOccurrences.has(alarmId)) return
  handledOccurrences.delete(alarmId)
  persist()
}

// ===== EXPORT =====
export {
  FIRE_WINDOW_MS,
  ensureLoaded,
  scheduledOccurrence,
  dueOccurrence,
  isOccurrenceHandled,
  markOccurrenceHandled,
  clearHandledOccurrence,
}
