// external libs
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'

// internal — absolute paths
import type { PuzzleType, Difficulty } from '@/puzzle/types'
import { useStore } from '@/store'
import { PressButton } from '@/components/ui'
import PuzzlePanel from '@/components/PuzzlePanel'
import { generatePuzzle, easePuzzle } from '@/puzzle/generator'
import { alarmSound } from '@/audio/alarmSound'
import { startVibration, stopVibration } from '@/alarm/scheduler'
import { dismissAlarmNotifications } from '@/alarm/nativeAlarms'
import { setScreenBarColor, ScreenColor } from '@/statusbar'

// ===== CONFIGURATIONS =====
const ScreenColorByType: Record<PuzzleType, ScreenColor> = { maze: 'amber', dots: 'green', squares: 'blue', colors: 'rose', symmetry: 'teal', symhex: 'teal', triangles: 'amber', tetris: 'amber', subtract: 'blue' }
const PUZZLE_TYPES: PuzzleType[] = ['maze', 'dots', 'squares', 'colors', 'symmetry', 'symhex', 'triangles', 'tetris', 'subtract']
const EASE_MIN_RESETS = 5
const EASE_MIN_RINGING_MS = 5 * 60 * 1000
const STOP_REDIRECT_MS = 1900
const SNOOZE_REDIRECT_MS = 1500

interface Props {
  alarmId: string
}

type Mode = 'main' | 'snooze'
type SolvedMessage = null | 'stopped' | 'snoozed'

// ===== UTILITIES =====
const pickType = (types: PuzzleType[] | undefined): PuzzleType => {
  const pool = types && types.length > 0 ? types : PUZZLE_TYPES
  return pool[Math.floor(Math.random() * pool.length)]
}

const formatClock = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

const greetingKey = (hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' => {
  if (hour >= 5 && hour < 12) return 'goodMorning'
  if (hour >= 12 && hour < 18) return 'goodAfternoon'
  return 'goodEvening'
}

// ===== MAIN COMPONENT =====
const Ringing = ({ alarmId }: Props) => {
  const { alarms, settings, t, setScreen, upsertAlarm } = useStore()
  const alarm = alarms.find(item => item.id === alarmId)
  const [mode, setMode] = useState<Mode>('main')
  const [resetSignal, setResetSignal] = useState(0)
  const [resets, setResets] = useState(0)
  const [eased, setEased] = useState(false)
  const [solvedMsg, setSolvedMsg] = useState<SolvedMessage>(null)
  const [solvedCount, setSolvedCount] = useState(0)
  const startedAt = useRef(Date.now())
  const rootRef = useRef<HTMLDivElement>(null)

  const difficulty: Difficulty = alarm?.difficulty ?? 'easy'
  const targetCount = alarm?.puzzleCount ?? 1

  const [mainPuzzle, setMainPuzzle] = useState(() => generatePuzzle(pickType(alarm?.puzzleTypes), difficulty))
  const snoozePuzzle = useMemo(() => generatePuzzle('maze', 'easy'), [mode === 'snooze' ? 1 : 0])

  useEffect(() => {
    if (!alarm) return
    dismissAlarmNotifications()
    alarmSound.start(alarm.soundId, {
      ramp: alarm.volumeRamp,
      rampSeconds: settings.rampSeconds,
      maxVolume: settings.maxVolume,
      ringtoneUri: alarm.ringtoneUri,
      boostSystem: true,
    })
    if (alarm.vibrate) startVibration()
    return () => {
      alarmSound.stop()
      stopVibration()
    }
  }, [])

  useEffect(() => {
    if (eased || resets <= EASE_MIN_RESETS) return
    const elapsed = Date.now() - startedAt.current
    if (elapsed >= EASE_MIN_RINGING_MS) {
      setMainPuzzle(puzzle => easePuzzle(puzzle))
      setEased(true)
      return
    }
    const remaining = EASE_MIN_RINGING_MS - elapsed
    const id = setTimeout(() => setResets(count => count), remaining + 100)
    return () => clearTimeout(id)
  }, [resets, eased])

  const handleMainSolved = () => {
    if (solvedCount + 1 >= targetCount) {
      finishStop()
      return
    }
    alarmSound.playSuccess()
    if (rootRef.current) {
      gsap.fromTo(rootRef.current, { filter: 'brightness(1)' }, { filter: 'brightness(1.4)', duration: 0.2, yoyo: true, repeat: 1 })
    }
    window.setTimeout(() => {
      setSolvedCount(count => count + 1)
      setEased(false)
      setMainPuzzle(generatePuzzle(pickType(alarm?.puzzleTypes), difficulty))
    }, 900)
  }

  const finishStop = () => {
    alarmSound.stop()
    stopVibration()
    alarmSound.playSuccess()
    if (alarm) {
      if (alarm.days.length === 0) upsertAlarm({ ...alarm, enabled: false, oneShotAt: undefined })
      else upsertAlarm({ ...alarm, oneShotAt: undefined })
    }
    setSolvedMsg('stopped')
    if (rootRef.current) {
      gsap.fromTo(rootRef.current, { filter: 'brightness(1)' }, { filter: 'brightness(1.6)', duration: 0.25, yoyo: true, repeat: 1 })
    }
    setTimeout(() => setScreen({ name: 'home' }), STOP_REDIRECT_MS)
  }

  const finishSnooze = () => {
    alarmSound.stop()
    stopVibration()
    alarmSound.playSuccess()
    if (alarm) {
      const minutes = alarm.snoozeMinutes || settings.snoozeMinutes
      upsertAlarm({ ...alarm, oneShotAt: Date.now() + minutes * 60000 })
    }
    setSolvedMsg('snoozed')
    setTimeout(() => setScreen({ name: 'home' }), SNOOZE_REDIRECT_MS)
  }

  if (!alarm) {
    setScreen({ name: 'home' })
    return null
  }

  const activePuzzle = mode === 'main' ? mainPuzzle : snoozePuzzle
  const screenColor = ScreenColorByType[activePuzzle.type]

  useEffect(() => {
    setScreenBarColor(screenColor)
  }, [screenColor])
  const snoozeMinutes = alarm.snoozeMinutes || settings.snoozeMinutes

  return (
    <div ref={rootRef} className={`screen screen--${screenColor} ${solvedMsg ? '' : 'pulse-bg'}`} style={{ justifyContent: 'space-between' }}>
      <AnimatePresence mode="wait">
        {solvedMsg ? (
          <motion.div
            key="solved"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
          >
            <div
              className="display"
              style={{ fontSize: 34, color: '#fff', textShadow: '0 0 24px rgba(255,255,255,0.6)', textAlign: 'center', padding: '0 16px' }}
            >
              {solvedMsg === 'stopped'
                ? alarm.solvedMessage?.trim() || t[greetingKey(new Date().getHours())]
                : `${t.snooze} · ${snoozeMinutes} ${t.minutes}`}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{t.solved}</div>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="label-sm"
                style={{ color: '#fff', fontSize: 13 }}
              >
                {t.ringingNow}
              </motion.div>
              <div className="ringing-time">{formatClock(new Date())}</div>
              <div style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700, fontSize: 15 }}>
                {mode === 'main' ? t.solveToStop : t.solveToSnooze}
                {mode === 'main' && targetCount > 1 ? ` · ${solvedCount + 1}/${targetCount}` : ''}
                {alarm.label ? ` · ${alarm.label}` : ''}
              </div>
              {eased && mode === 'main' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  {t.escapeHint}
                </motion.div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 'min(88vw, 60vh, 420px)' }}>
                <PuzzlePanel
                  puzzle={activePuzzle}
                  resetSignal={resetSignal}
                  onSolved={mode === 'main' ? handleMainSolved : finishSnooze}
                  onFail={() => setResets(count => count + 1)}
                />
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: 14, paddingBottom: 6 }}>
              <PressButton
                variant="ghost"
                onClick={() => {
                  setResetSignal(signal => signal + 1)
                  setResets(count => count + 1)
                }}
              >
                {t.reset}
              </PressButton>
              {mode === 'main' ? (
                <PressButton variant="dark" onClick={() => setMode('snooze')}>
                  {t.snooze}
                </PressButton>
              ) : (
                <PressButton variant="dark" onClick={() => setMode('main')}>
                  {t.stop}
                </PressButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== EXPORT =====
export default Ringing
