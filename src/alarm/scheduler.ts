// external libs
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// internal — absolute paths
import type { Alarm } from '@/types'
import { scheduleNativeAlarms } from '@/alarm/nativeAlarms'

// ===== CONFIGURATIONS =====
const NOTIFICATION_TITLE = 'Puzzalarm'
const NOTIFICATION_ID_RANGE = 100000
const VIBRATION_PULSE_MS = 600
const VIBRATION_INTERVAL_MS = 1600
const TAP_HAPTIC_MS = 12

// ===== UTILITIES =====
const notifId = (alarmId: string): number => {
  let hash = 0
  for (let i = 0; i < alarmId.length; i++) hash = (hash * 31 + alarmId.charCodeAt(i)) | 0
  return Math.abs(hash % NOTIFICATION_ID_RANGE) + 1
}

const formatTime = (hour: number, minute: number): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

const nextOccurrence = (alarm: Alarm, from = Date.now()): number | null => {
  if (!alarm.enabled) return null
  if (alarm.oneShotAt && alarm.oneShotAt > from) return alarm.oneShotAt
  if (alarm.days.length === 0) {
    const date = new Date(from)
    date.setHours(alarm.hour, alarm.minute, 0, 0)
    if (date.getTime() <= from) date.setDate(date.getDate() + 1)
    return date.getTime()
  }
  for (let offset = 0; offset < 8; offset++) {
    const date = new Date(from)
    date.setDate(date.getDate() + offset)
    date.setHours(alarm.hour, alarm.minute, 0, 0)
    if (date.getTime() <= from) continue
    if (alarm.days.includes(date.getDay())) return date.getTime()
  }
  return null
}

const formatCountdown = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

// ===== SERVICE =====
const ensureNotificationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        return false
      }
    }
    return 'Notification' in window && Notification.permission === 'granted'
  }
  const status = await LocalNotifications.checkPermissions()
  if (status.display !== 'granted') {
    const request = await LocalNotifications.requestPermissions()
    return request.display === 'granted'
  }
  return true
}

const syncNotifications = async (alarms: Alarm[]): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  const toSchedule = alarms
    .map(alarm => ({ alarm, at: nextOccurrence(alarm) }))
    .filter((entry): entry is { alarm: Alarm; at: number } => entry.at !== null)
    .map(({ alarm, at }) => ({
      id: alarm.id,
      notifId: notifId(alarm.id),
      at,
      title: NOTIFICATION_TITLE,
      body: alarm.label || formatTime(alarm.hour, alarm.minute),
    }))
  await scheduleNativeAlarms(toSchedule)
}

let vibrateTimer: number | null = null

const startVibration = (): void => {
  const pulse = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.vibrate({ duration: VIBRATION_PULSE_MS })
      } catch {
        return
      }
    } else if (navigator.vibrate) {
      navigator.vibrate([VIBRATION_PULSE_MS, 200, VIBRATION_PULSE_MS])
    }
  }
  pulse()
  vibrateTimer = window.setInterval(pulse, VIBRATION_INTERVAL_MS)
}

const stopVibration = (): void => {
  if (vibrateTimer !== null) {
    clearInterval(vibrateTimer)
    vibrateTimer = null
  }
  if (!Capacitor.isNativePlatform() && navigator.vibrate) navigator.vibrate(0)
}

const tapHaptic = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      return
    }
  } else if (navigator.vibrate) {
    navigator.vibrate(TAP_HAPTIC_MS)
  }
}

// ===== EXPORT =====
export {
  nextOccurrence,
  formatCountdown,
  ensureNotificationPermission,
  syncNotifications,
  startVibration,
  stopVibration,
  tapHaptic,
}
