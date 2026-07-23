// external libs
import { Capacitor, registerPlugin } from '@capacitor/core'

// ===== TYPES =====
export interface NativeAlarmEntry {
  id: string
  notifId: number
  at: number
  title: string
  body: string
}

interface AlarmSchedulerPlugin {
  schedule(options: { alarms: NativeAlarmEntry[] }): Promise<void>
  consumeLaunchAlarmId(): Promise<{ alarmId: string | null }>
  dismissNotifications(): Promise<void>
  canUseFullScreenIntent(): Promise<{ granted: boolean }>
  openFullScreenIntentSettings(): Promise<void>
}

// ===== CONFIGURATIONS =====
const plugin = registerPlugin<AlarmSchedulerPlugin>('AlarmScheduler')

// ===== SERVICE =====
const nativeAlarmsAvailable = (): boolean => Capacitor.isNativePlatform()

const scheduleNativeAlarms = async (alarms: NativeAlarmEntry[]): Promise<void> => {
  if (!nativeAlarmsAvailable()) return
  try {
    await plugin.schedule({ alarms })
  } catch {
    return
  }
}

const consumeLaunchAlarmId = async (): Promise<string | null> => {
  if (!nativeAlarmsAvailable()) return null
  try {
    const { alarmId } = await plugin.consumeLaunchAlarmId()
    return alarmId ?? null
  } catch {
    return null
  }
}

const dismissAlarmNotifications = async (): Promise<void> => {
  if (!nativeAlarmsAvailable()) return
  try {
    await plugin.dismissNotifications()
  } catch {
    return
  }
}

const canUseFullScreenIntent = async (): Promise<boolean> => {
  if (!nativeAlarmsAvailable()) return true
  try {
    const { granted } = await plugin.canUseFullScreenIntent()
    return granted
  } catch {
    return true
  }
}

const openFullScreenIntentSettings = async (): Promise<void> => {
  if (!nativeAlarmsAvailable()) return
  try {
    await plugin.openFullScreenIntentSettings()
  } catch {
    return
  }
}

// ===== EXPORT =====
export {
  nativeAlarmsAvailable,
  scheduleNativeAlarms,
  consumeLaunchAlarmId,
  dismissAlarmNotifications,
  canUseFullScreenIntent,
  openFullScreenIntentSettings,
}
