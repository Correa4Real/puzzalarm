// external libs
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// internal — absolute paths
import type { PuzzleType } from '@/puzzle/types'
import { useStore } from '@/store'
import { PressButton } from '@/components/ui'
import PuzzlePanel from '@/components/PuzzlePanel'
import { generatePuzzle } from '@/puzzle/generator'
import { alarmSound } from '@/audio/alarmSound'
import { setScreenBarColor, ScreenColor } from '@/statusbar'

// ===== CONFIGURATIONS =====
const ScreenColorByType: Record<PuzzleType, ScreenColor> = { maze: 'amber', dots: 'green', squares: 'blue', colors: 'rose', symmetry: 'teal', symhex: 'teal' }

interface Props {
  from: 'settings' | 'home'
}

// ===== MAIN COMPONENT =====
const Tutorial = ({ from }: Props) => {
  const { t, setScreen } = useStore()
  const [step, setStep] = useState(0)
  const [solved, setSolved] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)

  const steps: Array<{ type: PuzzleType; texts: string[] }> = [
    { type: 'maze', texts: [t.tutMaze1, t.tutMaze2] },
    { type: 'dots', texts: [t.tutDots1] },
    { type: 'squares', texts: [t.tutSquares1] },
    { type: 'colors', texts: [t.tutColors1] },
    { type: 'symmetry', texts: [t.tutSymmetry1] },
    { type: 'symhex', texts: [t.tutSymhex1] },
  ]

  const current = steps[step]
  const puzzle = useMemo(() => generatePuzzle(current.type, 'easy'), [step])

  useEffect(() => {
    setScreenBarColor(ScreenColorByType[current.type])
  }, [current.type])

  const goBack = () => setScreen({ name: from === 'settings' ? 'settings' : 'home' })

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      setSolved(false)
    } else {
      goBack()
    }
  }

  return (
    <div className={`screen screen--${ScreenColorByType[current.type]}`} style={{ justifyContent: 'space-between' }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <PressButton variant="ghost" onClick={goBack} style={{ padding: '10px 14px' }}>
          {'←'}
        </PressButton>
        <span className="screen-title">{t.tutorialTitle}</span>
        <span style={{ width: 48, fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'right' }}>
          {step + 1}/{steps.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div className="card card--dark" style={{ fontWeight: 600, lineHeight: 1.5 }}>
            {current.texts.map((text, index) => (
              <p key={index} style={{ marginBottom: index < current.texts.length - 1 ? 10 : 0 }}>{text}</p>
            ))}
            <p style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>{t.tryIt}</p>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 'min(80vw, 48vh, 360px)' }}>
              <PuzzlePanel
                puzzle={puzzle}
                resetSignal={resetSignal}
                onSolved={() => {
                  setSolved(true)
                  alarmSound.playSuccess()
                }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="row" style={{ justifyContent: 'center', gap: 14, paddingBottom: 6 }}>
        <PressButton variant="ghost" onClick={() => setResetSignal(signal => signal + 1)}>
          {t.reset}
        </PressButton>
        <PressButton variant="dark" disabled={!solved} onClick={next} style={{ minWidth: 140 }}>
          {step < steps.length - 1 ? t.next : t.done}
        </PressButton>
      </div>
    </div>
  )
}

// ===== EXPORT =====
export default Tutorial
