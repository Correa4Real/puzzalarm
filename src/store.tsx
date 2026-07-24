// external libs
import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react'

// internal — absolute paths
import type { Alarm, Folder, Settings, Screen } from '@/types'
import { defaultSettings, normalizeAlarm } from '@/types'
import { loadJSON, saveJSON } from '@/storage'
import type { Dict } from '@/i18n'
import { getDict } from '@/i18n'
import { nextOccurrence, syncNotifications } from '@/alarm/scheduler'

// ===== CONFIGURATIONS =====
const StorageKeys = {
  alarms: 'alarms',
  folders: 'folders',
  settings: 'settings',
}

const TICK_INTERVAL_MS = 1000
const FIRE_WINDOW_MS = 60000

interface Store {
  alarms: Alarm[]
  folders: Folder[]
  settings: Settings
  screen: Screen
  t: Dict
  ready: boolean
  setScreen: (screen: Screen) => void
  upsertAlarm: (alarm: Alarm) => void
  deleteAlarm: (id: string) => void
  toggleAlarm: (id: string, enabled: boolean) => void
  upsertFolder: (folder: Folder) => void
  deleteFolder: (id: string) => void
  setFolderEnabled: (id: string, enabled: boolean) => void
  setSettings: (patch: Partial<Settings>) => void
}

const Ctx = createContext<Store | null>(null)

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

  useEffect(() => {
    const load = async () => {
      const [storedAlarms, storedFolders, storedSettings] = await Promise.all([
        loadJSON<Alarm[]>(StorageKeys.alarms),
        loadJSON<Folder[]>(StorageKeys.folders),
        loadJSON<Settings>(StorageKeys.settings),
      ])
      if (storedAlarms) setAlarms(storedAlarms.map(normalizeAlarm))
      if (storedFolders) setFolders(storedFolders)
      if (storedSettings) setSettingsState({ ...defaultSettings, ...storedSettings })
      setReady(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (!ready) return
    saveJSON(StorageKeys.alarms, alarms)
    syncNotifications(alarms)
  }, [alarms, ready])

  useEffect(() => {
    if (!ready) return
    saveJSON(StorageKeys.folders, folders)
  }, [folders, ready])

  useEffect(() => {
    if (!ready) return
    saveJSON(StorageKeys.settings, settings)
  }, [settings, ready])

  useEffect(() => {
    const fired = new Set<string>()
    const tick = () => {
      if (screenRef.current.name === 'ringing') return
      const now = Date.now()
      for (const alarm of alarmsRef.current) {
        const at = nextOccurrence(alarm, now - FIRE_WINDOW_MS)
        if (at !== null && at <= now && now - at < FIRE_WINDOW_MS) {
          const key = `${alarm.id}:${at}`
          if (fired.has(key)) continue
          fired.add(key)
          setScreen({ name: 'ringing', alarmId: alarm.id })
          return
        }
      }
    }
    const id = window.setInterval(tick, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const upsertAlarm = useCallback((alarm: Alarm) => {
    setAlarms(prev => {
      const index = prev.findIndex(item => item.id === alarm.id)
      if (index === -1) return [...prev, alarm]
      const copy = prev.slice()
      copy[index] = alarm
      return copy
    })
  }, [])

  const deleteAlarm = useCallback((id: string) => {
    setAlarms(prev => prev.filter(alarm => alarm.id !== id))
  }, [])

  const toggleAlarm = useCallback((id: string, enabled: boolean) => {
    setAlarms(prev => prev.map(alarm => (alarm.id === id ? { ...alarm, enabled } : alarm)))
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
    setAlarms(prev => prev.map(alarm => (alarm.folderId === id ? { ...alarm, enabled } : alarm)))
  }, [])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState(prev => ({ ...prev, ...patch }))
  }, [])

  const t = getDict(settings.language)

  return (
    <Ctx.Provider value={{ alarms, folders, settings, screen, t, ready, setScreen, upsertAlarm, deleteAlarm, toggleAlarm, upsertFolder, deleteFolder, setFolderEnabled, setSettings }}>
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
