// external libs
import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react'

// internal — absolute paths
import type { Alarm, Folder, Settings, Screen } from '@/types'
import { defaultSettings, normalizeAlarm } from '@/types'
import { loadJSON, saveJSON } from '@/storage'
import type { Dict } from '@/i18n'
import { getDict } from '@/i18n'
import { syncNotifications } from '@/alarm/scheduler'
import {
  ensureLoaded,
  dueOccurrence,
  isOccurrenceHandled,
  markOccurrenceHandled,
  clearHandledOccurrence,
} from '@/alarm/session'
import type { Plan } from '@/plan'
import { foldersLocked, clampAlarmForPlan } from '@/plan'

// ===== CONFIGURATIONS =====
const StorageKeys = {
  alarms: 'alarms',
  folders: 'folders',
  settings: 'settings',
}

const TICK_INTERVAL_MS = 1000

interface Store {
  alarms: Alarm[]
  folders: Folder[]
  settings: Settings
  screen: Screen
  t: Dict
  ready: boolean
  foldersAreLocked: boolean
  setScreen: (screen: Screen) => void
  openRinging: (alarmId: string) => boolean
  upsertAlarm: (alarm: Alarm) => void
  deleteAlarm: (id: string) => void
  toggleAlarm: (id: string, enabled: boolean) => void
  upsertFolder: (folder: Folder) => void
  deleteFolder: (id: string) => void
  setFolderEnabled: (id: string, enabled: boolean) => void
  setSettings: (patch: Partial<Settings>) => void
  activatePro: () => void
  downgradeToFree: () => void
}

const Ctx = createContext<Store | null>(null)

// ===== UTILITIES =====
const disableFolderAlarms = (alarms: Alarm[]): Alarm[] =>
  alarms.map(alarm => (alarm.folderId ? { ...alarm, enabled: false, oneShotAt: undefined } : alarm))

// ===== MAIN COMPONENT =====
const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [settings, setSettingsState] = useState<Settings>(defaultSettings)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [ready, setReady] = useState(false)
  const alarmsRef = useRef(alarms)
  alarmsRef.current = alarms
  const screenRef = useRef(screen)
  screenRef.current = screen
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const foldersRef = useRef(folders)
  foldersRef.current = folders

  const foldersAreLocked = foldersLocked(settings.plan, folders.length)

  useEffect(() => {
    const load = async () => {
      await ensureLoaded()
      const [storedAlarms, storedFolders, storedSettings] = await Promise.all([
        loadJSON<Alarm[]>(StorageKeys.alarms),
        loadJSON<Folder[]>(StorageKeys.folders),
        loadJSON<Settings>(StorageKeys.settings),
      ])
      const nextSettings = storedSettings ? { ...defaultSettings, ...storedSettings } : defaultSettings
      let nextAlarms = storedAlarms ? storedAlarms.map(normalizeAlarm) : []
      const nextFolders = storedFolders ?? []
      if (foldersLocked(nextSettings.plan, nextFolders.length)) {
        nextAlarms = disableFolderAlarms(nextAlarms)
      }
      if (storedAlarms) setAlarms(nextAlarms)
      if (storedFolders) setFolders(nextFolders)
      setSettingsState(nextSettings)
      setReady(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (!ready) return
    saveJSON(StorageKeys.alarms, alarms)
    const locked = foldersLocked(settings.plan, folders.length)
    const schedulable = locked ? alarms.filter(alarm => !alarm.folderId) : alarms
    syncNotifications(schedulable)
  }, [alarms, folders, settings.plan, ready])

  useEffect(() => {
    if (!ready) return
    saveJSON(StorageKeys.folders, folders)
  }, [folders, ready])

  useEffect(() => {
    if (!ready) return
    saveJSON(StorageKeys.settings, settings)
  }, [settings, ready])

  useEffect(() => {
    if (!ready) return
    if (!foldersLocked(settings.plan, folders.length)) return
    setAlarms(prev => {
      const needsDisable = prev.some(alarm => alarm.folderId && (alarm.enabled || alarm.oneShotAt))
      return needsDisable ? disableFolderAlarms(prev) : prev
    })
  }, [settings.plan, folders.length, ready])

  const openRinging = useCallback((alarmId: string): boolean => {
    if (screenRef.current.name === 'ringing') return false
    const alarm = alarmsRef.current.find(item => item.id === alarmId)
    if (!alarm || !alarm.enabled) return false
    if (foldersLocked(settingsRef.current.plan, foldersRef.current.length) && alarm.folderId) return false
    const at = dueOccurrence(alarm)
    if (at === null) return false
    if (isOccurrenceHandled(alarmId, at)) return false
    markOccurrenceHandled(alarmId, at)
    setScreen({ name: 'ringing', alarmId })
    return true
  }, [])

  useEffect(() => {
    const tick = () => {
      if (screenRef.current.name === 'ringing') return
      const locked = foldersLocked(settingsRef.current.plan, foldersRef.current.length)
      for (const alarm of alarmsRef.current) {
        if (locked && alarm.folderId) continue
        const at = dueOccurrence(alarm)
        if (at === null) continue
        if (isOccurrenceHandled(alarm.id, at)) continue
        markOccurrenceHandled(alarm.id, at)
        setScreen({ name: 'ringing', alarmId: alarm.id })
        return
      }
    }
    const id = window.setInterval(tick, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const upsertAlarm = useCallback((alarm: Alarm) => {
    const clamped = clampAlarmForPlan(alarm, settingsRef.current.plan)
    if (clamped.oneShotAt && clamped.oneShotAt > Date.now()) clearHandledOccurrence(clamped.id)
    setAlarms(prev => {
      const index = prev.findIndex(item => item.id === clamped.id)
      if (index === -1) return [...prev, clamped]
      const copy = prev.slice()
      copy[index] = clamped
      return copy
    })
  }, [])

  const deleteAlarm = useCallback((id: string) => {
    clearHandledOccurrence(id)
    setAlarms(prev => prev.filter(alarm => alarm.id !== id))
  }, [])

  const toggleAlarm = useCallback((id: string, enabled: boolean) => {
    setAlarms(prev => {
      const target = prev.find(alarm => alarm.id === id)
      if (!target) return prev
      if (
        enabled &&
        target.folderId &&
        foldersLocked(settingsRef.current.plan, foldersRef.current.length)
      ) {
        return prev
      }
      return prev.map(alarm => (alarm.id === id ? { ...alarm, enabled } : alarm))
    })
  }, [])

  const upsertFolder = useCallback((folder: Folder) => {
    setFolders(prev => {
      const index = prev.findIndex(item => item.id === folder.id)
      if (index === -1) return [...prev, folder]
      const copy = prev.slice()
      copy[index] = folder
      return copy
    })
  }, [])

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(folder => folder.id !== id))
    setAlarms(prev => prev.map(alarm => (alarm.folderId === id ? { ...alarm, folderId: undefined } : alarm)))
  }, [])

  const setFolderEnabled = useCallback((id: string, enabled: boolean) => {
    if (enabled && foldersLocked(settingsRef.current.plan, foldersRef.current.length)) return
    setAlarms(prev => prev.map(alarm => (alarm.folderId === id ? { ...alarm, enabled } : alarm)))
  }, [])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState(prev => ({ ...prev, ...patch }))
  }, [])

  const activatePro = useCallback(() => {
    setSettingsState(prev => ({ ...prev, plan: 'pro' as Plan }))
  }, [])

  const downgradeToFree = useCallback(() => {
    setSettingsState(prev => ({ ...prev, plan: 'free' as Plan }))
    setAlarms(prev => disableFolderAlarms(prev))
  }, [])

  const t = getDict(settings.language)

  return (
    <Ctx.Provider
      value={{
        alarms,
        folders,
        settings,
        screen,
        t,
        ready,
        foldersAreLocked,
        setScreen,
        openRinging,
        upsertAlarm,
        deleteAlarm,
        toggleAlarm,
        upsertFolder,
        deleteFolder,
        setFolderEnabled,
        setSettings,
        activatePro,
        downgradeToFree,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

// ===== HOOKS =====
const useStore = (): Store => {
  const store = useContext(Ctx)
  if (!store) throw new Error('StoreProvider missing')
  return store
}

// ===== EXPORT =====
export { StoreProvider, useStore }
