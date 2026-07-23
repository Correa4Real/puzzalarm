// external libs
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

// internal — absolute paths
import type { Screen } from '@/types'
import { useStore } from '@/store'
import { consumeLaunchAlarmId } from '@/alarm/nativeAlarms'
import Home from '@/screens/Home'
import EditAlarm from '@/screens/EditAlarm'
import Ringing from '@/screens/Ringing'
import Settings from '@/screens/Settings'
import Tutorial from '@/screens/Tutorial'
import PuzzleTest from '@/screens/PuzzleTest'

// ===== CONFIGURATIONS =====
const ScreenDepth: Record<Screen['name'], number> = {
  home: 0,
  settings: 1,
  edit: 1,
  tutorial: 2,
  test: 2,
  ringing: 2,
}

const slideTransition = { type: 'spring', stiffness: 300, damping: 34 } as const

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-28%',
    zIndex: direction > 0 ? 2 : 1,
  }),
  center: (direction: number) => ({
    x: '0%',
    zIndex: direction > 0 ? 2 : 1,
  }),
  exit: (direction: number) => ({
    x: direction > 0 ? '-28%' : '100%',
    zIndex: direction > 0 ? 1 : 2,
  }),
}

// ===== UTILITIES =====
const screenKey = (screen: Screen): string => {
  if (screen.name === 'edit') return `edit-${screen.alarmId ?? 'new'}`
  if (screen.name === 'ringing') return `ring-${screen.alarmId}`
  return screen.name
}

const renderScreen = (screen: Screen) => {
  switch (screen.name) {
    case 'home':
      return <Home />
    case 'edit':
      return <EditAlarm alarmId={screen.alarmId} />
    case 'settings':
      return <Settings />
    case 'tutorial':
      return <Tutorial from={screen.from} />
    case 'test':
      return <PuzzleTest />
    case 'ringing':
      return <Ringing alarmId={screen.alarmId} />
  }
}

// ===== MAIN COMPONENT =====
const App = () => {
  const { screen, ready, setScreen } = useStore()
  const previousScreenRef = useRef(screen)
  const directionRef = useRef(1)
  const screenRef = useRef(screen)
  screenRef.current = screen

  if (previousScreenRef.current !== screen) {
    directionRef.current = ScreenDepth[screen.name] >= ScreenDepth[previousScreenRef.current.name] ? 1 : -1
    previousScreenRef.current = screen
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const subscription = CapacitorApp.addListener('backButton', () => {
      const current = screenRef.current
      switch (current.name) {
        case 'home':
          CapacitorApp.exitApp()
          break
        case 'edit':
        case 'settings':
          setScreen({ name: 'home' })
          break
        case 'tutorial':
          setScreen({ name: current.from === 'settings' ? 'settings' : 'home' })
          break
        case 'test':
          setScreen({ name: 'settings' })
          break
        case 'ringing':
          break
      }
    })
    return () => {
      subscription.then(handle => handle.remove())
    }
  }, [setScreen])

  useEffect(() => {
    const openPendingAlarm = async () => {
      const alarmId = await consumeLaunchAlarmId()
      if (alarmId) setScreen({ name: 'ringing', alarmId })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') openPendingAlarm()
    }
    openPendingAlarm()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [setScreen])

  if (!ready) return <div className="app" />

  return (
    <div className="app">
      <AnimatePresence initial={false} custom={directionRef.current}>
        <motion.div
          key={screenKey(screen)}
          className="screen-wrap"
          custom={directionRef.current}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
        >
          {renderScreen(screen)}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ===== EXPORT =====
export default App
