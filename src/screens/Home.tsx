// external libs
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// internal — absolute paths
import type { Alarm } from '@/types'
import { useStore } from '@/store'
import { PressButton, WToggle, ScreenShell, GearIcon } from '@/components/ui'
import { nextOccurrence, formatCountdown } from '@/alarm/scheduler'

// ===== CONFIGURATIONS =====
const CLOCK_TICK_MS = 1000
const PRESS_ANIMATION_MS = 140
const WEEKDAY_SET = [1, 2, 3, 4, 5]
const WEEKEND_SET = [0, 6]

// ===== UTILITIES =====
const formatTime = (hour: number, minute: number): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

// ===== MAIN COMPONENT =====
const Home = () => {
  const { alarms, t, setScreen, toggleAlarm } = useStore()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const clock = new Date(now)
  const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))

  const nextAlarm = alarms
    .map(alarm => ({ alarm, at: nextOccurrence(alarm, now) }))
    .filter((entry): entry is { alarm: Alarm; at: number } => entry.at !== null)
    .sort((a, b) => a.at - b.at)[0]

  const puzzleLabel = (alarm: Alarm): string => {
    const first = t[alarm.puzzleTypes[0] ?? 'maze']
    const extra = alarm.puzzleTypes.length > 1 ? ` +${alarm.puzzleTypes.length - 1}` : ''
    const count = alarm.puzzleCount > 1 ? ` (${alarm.puzzleCount})` : ''
    return `${first}${extra}${count}`
  }

  const daysLabel = (alarm: Alarm): string => {
    if (alarm.days.length === 0) return t.once
    if (alarm.days.length === 7) return t.everyDay
    if (alarm.days.length === 5 && WEEKDAY_SET.every(day => alarm.days.includes(day))) return t.weekdays
    if (alarm.days.length === 2 && WEEKEND_SET.every(day => alarm.days.includes(day))) return t.weekend
    return alarm.days.map(day => t.daysShort[day]).join(' ')
  }

  return (
    <ScreenShell color="amber">
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="screen-title">{t.appName}</span>
        <PressButton variant="ghost" onClick={() => setScreen({ name: 'settings' })} style={{ padding: '12px 14px' }}>
          <GearIcon />
        </PressButton>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
        style={{ textAlign: 'center', margin: '18px 0 6px' }}
      >
        <div className="clock-big" style={{ fontSize: 'clamp(54px, 19vw, 84px)', lineHeight: 1 }}>
          {formatTime(clock.getHours(), clock.getMinutes())}
        </div>
        {nextAlarm && (
          <div style={{ marginTop: 8, fontWeight: 600, opacity: 0.8, fontSize: 14 }}>
            {formatTime(nextAlarm.alarm.hour, nextAlarm.alarm.minute)} · {t.ringsIn} {formatCountdown(nextAlarm.at - now)}
          </div>
        )}
      </motion.div>

      <div className="stack" style={{ marginTop: 22, paddingBottom: 110 }}>
        {sorted.length === 0 && (
          <div className="card card--dark" style={{ textAlign: 'center', whiteSpace: 'pre-line', padding: '30px 20px', fontWeight: 600 }}>
            {t.noAlarms}
          </div>
        )}
        {sorted.map((alarm, index) => (
          <motion.div
            key={alarm.id}
            className={`card alarm-card ${alarm.enabled ? '' : 'off'}`}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.06 * index, type: 'spring', stiffness: 300, damping: 26 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTimeout(() => setScreen({ name: 'edit', alarmId: alarm.id }), PRESS_ANIMATION_MS)}
          >
            <div className="meta">
              <div className="time">{formatTime(alarm.hour, alarm.minute)}</div>
              <div className="days">
                {daysLabel(alarm)}
                {alarm.label ? ` · ${alarm.label}` : ''} · {puzzleLabel(alarm)}
              </div>
            </div>
            <div onClick={e => e.stopPropagation()}>
              <WToggle on={alarm.enabled} onChange={enabled => toggleAlarm(alarm.id, enabled)} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="fab">
        <PressButton variant="dark round" onClick={() => setScreen({ name: 'edit' })}>
          +
        </PressButton>
      </div>
    </ScreenShell>
  )
}

// ===== EXPORT =====
export default Home
