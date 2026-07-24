// external libs
import { motion } from 'framer-motion'

// internal — absolute paths
import type { Alarm } from '@/types'
import type { Dict } from '@/i18n'
import { WToggle } from '@/components/ui'

// ===== CONFIGURATIONS =====
const WEEKDAY_SET = [1, 2, 3, 4, 5]
const WEEKEND_SET = [0, 6]
const PRESS_ANIMATION_MS = 140

interface AlarmCardProps {
  alarm: Alarm
  t: Dict
  index: number
  onOpen: () => void
  onToggle: (enabled: boolean) => void
}

// ===== UTILITIES =====
const formatTime = (hour: number, minute: number): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

const puzzleLabel = (alarm: Alarm, t: Dict): string => {
  const first = t[alarm.puzzleTypes[0] ?? 'maze']
  const extra = alarm.puzzleTypes.length > 1 ? ` +${alarm.puzzleTypes.length - 1}` : ''
  const count = alarm.puzzleCount > 1 ? ` (${alarm.puzzleCount})` : ''
  return `${first}${extra}${count}`
}

const daysLabel = (alarm: Alarm, t: Dict): string => {
  if (alarm.days.length === 0) return t.once
  if (alarm.days.length === 7) return t.everyDay
  if (alarm.days.length === 5 && WEEKDAY_SET.every(day => alarm.days.includes(day))) return t.weekdays
  if (alarm.days.length === 2 && WEEKEND_SET.every(day => alarm.days.includes(day))) return t.weekend
  return alarm.days.map(day => t.daysShort[day]).join(' ')
}

// ===== MAIN COMPONENT =====
const AlarmCard = ({ alarm, t, index, onOpen, onToggle }: AlarmCardProps) => (
  <motion.div
    className={`card alarm-card ${alarm.enabled ? '' : 'off'}`}
    initial={{ y: 24, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.06 * index, type: 'spring', stiffness: 300, damping: 26 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => setTimeout(onOpen, PRESS_ANIMATION_MS)}
  >
    <div className="meta">
      <div className="time">{formatTime(alarm.hour, alarm.minute)}</div>
      <div className="days">
        {daysLabel(alarm, t)}
        {alarm.label ? ` · ${alarm.label}` : ''} · {puzzleLabel(alarm, t)}
      </div>
    </div>
    <div onClick={e => e.stopPropagation()}>
      <WToggle on={alarm.enabled} onChange={onToggle} />
    </div>
  </motion.div>
)

// ===== EXPORT =====
export { AlarmCard, formatTime }
