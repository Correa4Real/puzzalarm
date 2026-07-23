// external libs
import { ReactNode, useEffect, useRef, useState } from 'react'

// internal — absolute paths
import { tapHaptic } from '@/alarm/scheduler'
import { setScreenBarColor } from '@/statusbar'

// ===== CONFIGURATIONS =====
const WHEEL_CELL_HEIGHT = 60
const PRESS_ANIMATION_MS = 140

type ButtonVariant = '' | 'dark' | 'ghost' | 'round' | 'dark round' | 'ghost round'

interface PressButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  className?: string
  disabled?: boolean
  style?: React.CSSProperties
}

interface WToggleProps {
  on: boolean
  onChange: (value: boolean) => void
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

interface MultiSelectProps<T extends string> {
  options: Array<{ value: T; label: string }>
  values: T[]
  onToggle: (value: T) => void
}

interface TimeWheelProps {
  count: number
  value: number
  onChange: (value: number) => void
  step?: number
}

interface ScreenShellProps {
  color: 'amber' | 'green' | 'blue' | 'rose' | 'teal'
  children: ReactNode
  className?: string
}

// ===== COMPONENTS =====
const PressButton = ({ children, onClick, variant = '', className = '', disabled, style }: PressButtonProps) => {
  const [pressed, setPressed] = useState(false)
  const variantClasses = variant.split(' ').filter(Boolean).map(v => `pbtn--${v}`).join(' ')
  return (
    <button
      className={`pbtn ${variantClasses} ${pressed ? 'pressed' : ''} ${className}`}
      style={style}
      disabled={disabled}
      onClick={() => {
        if (pressed) return
        tapHaptic()
        setPressed(true)
        window.setTimeout(() => {
          setPressed(false)
          onClick?.()
        }, PRESS_ANIMATION_MS)
      }}
    >
      {children}
    </button>
  )
}

const WToggle = ({ on, onChange }: WToggleProps) => (
  <button
    className={`wtoggle ${on ? 'on' : ''}`}
    onClick={() => {
      tapHaptic()
      onChange(!on)
    }}
    aria-pressed={on}
  >
    <span className="knob" />
  </button>
)

const Segmented = <T extends string>({ options, value, onChange }: SegmentedProps<T>) => (
  <div className="seg">
    {options.map(option => (
      <button
        key={option.value}
        className={option.value === value ? 'on' : ''}
        onClick={() => {
          tapHaptic()
          onChange(option.value)
        }}
      >
        {option.label}
      </button>
    ))}
  </div>
)

const MultiSelect = <T extends string>({ options, values, onToggle }: MultiSelectProps<T>) => (
  <div className="seg">
    {options.map(option => (
      <button
        key={option.value}
        className={values.includes(option.value) ? 'on' : ''}
        onClick={() => {
          tapHaptic()
          onToggle(option.value)
        }}
      >
        {option.label}
      </button>
    ))}
  </div>
)

const TimeWheel = ({ count, value, onChange, step = 1 }: TimeWheelProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const cells = Array.from({ length: Math.ceil(count / step) }, (_, i) => i * step)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTop = (value / step) * WHEEL_CELL_HEIGHT
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = () => {
    const el = ref.current
    if (!el) return
    const index = Math.round(el.scrollTop / WHEEL_CELL_HEIGHT)
    const next = cells[Math.max(0, Math.min(cells.length - 1, index))]
    if (next !== value) onChange(next)
  }

  return (
    <div className="timewheel" ref={ref} onScroll={handleScroll}>
      <div style={{ height: WHEEL_CELL_HEIGHT }} />
      {cells.map(cell => (
        <div key={cell} className="cell" style={{ opacity: cell === value ? 1 : 0.4 }}>
          {String(cell).padStart(2, '0')}
        </div>
      ))}
      <div style={{ height: WHEEL_CELL_HEIGHT }} />
    </div>
  )
}

const ScreenShell = ({ color, children, className = '' }: ScreenShellProps) => {
  useEffect(() => {
    setScreenBarColor(color)
  }, [color])

  return <div className={`screen screen--${color} ${className}`}>{children}</div>
}

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

// ===== EXPORT =====
export { PressButton, WToggle, Segmented, MultiSelect, TimeWheel, ScreenShell, GearIcon }
