// external libs
import { useEffect, useState } from 'react'

// internal — absolute paths
import type { PuzzleType, Difficulty } from '@/puzzle/types'
import { useStore } from '@/store'
import { PressButton, Segmented } from '@/components/ui'
import PuzzlePanel from '@/components/PuzzlePanel'
import { generatePuzzle } from '@/puzzle/generator'
import { alarmSound } from '@/audio/alarmSound'
import { setScreenBarColor, ScreenColor } from '@/statusbar'

// ===== CONFIGURATIONS =====
const ScreenColorByType: Record<PuzzleType, ScreenColor> = { maze: 'amber', dots: 'green', squares: 'blue', colors: 'rose', symmetry: 'teal', symhex: 'teal', triangles: 'amber', tetris: 'amber', subtract: 'blue' }
const NEXT_PUZZLE_DELAY_MS = 1200

// ===== MAIN COMPONENT =====
const PuzzleTest = () => {
  const { t, setScreen } = useStore()
  const [type, setType] = useState<PuzzleType>('maze')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [puzzle, setPuzzle] = useState(() => generatePuzzle('maze', 'easy'))
  const [resetSignal, setResetSignal] = useState(0)
  const [solvedCount, setSolvedCount] = useState(0)

  useEffect(() => {
    setScreenBarColor(ScreenColorByType[type])
  }, [type])

  const regenerate = (nextType: PuzzleType = type, nextDifficulty: Difficulty = difficulty) => {
    setPuzzle(generatePuzzle(nextType, nextDifficulty))
    setResetSignal(signal => signal + 1)
  }

  return (
    <div className={`screen screen--${ScreenColorByType[type]}`} style={{ justifyContent: 'space-between' }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <PressButton variant="ghost" onClick={() => setScreen({ name: 'settings' })} style={{ padding: '10px 14px' }}>
          {'←'}
        </PressButton>
        <span className="screen-title">{t.testMode}</span>
        <span style={{ width: 48, textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          {solvedCount}
        </span>
      </div>

      <div className="stack">
        <Segmented
          value={type}
          onChange={nextType => {
            setType(nextType)
            regenerate(nextType, difficulty)
          }}
          options={[
            { value: 'maze', label: t.maze },
            { value: 'dots', label: t.dots },
            { value: 'squares', label: t.squares },
          ]}
        />
        <Segmented
          value={type}
          onChange={nextType => {
            setType(nextType)
            regenerate(nextType, difficulty)
          }}
          options={[
            { value: 'colors', label: t.colors },
            { value: 'symmetry', label: t.symmetry },
            { value: 'symhex', label: t.symhex },
          ]}
        />
        <Segmented
          value={type}
          onChange={nextType => {
            setType(nextType)
            regenerate(nextType, difficulty)
          }}
          options={[
            { value: 'triangles', label: t.triangles },
            { value: 'tetris', label: t.tetris },
            { value: 'subtract', label: t.subtract },
          ]}
        />
        <Segmented
          value={difficulty}
          onChange={nextDifficulty => {
            setDifficulty(nextDifficulty)
            regenerate(type, nextDifficulty)
          }}
          options={[
            { value: 'easy', label: t.easy },
            { value: 'medium', label: t.medium },
            { value: 'hard', label: t.hard },
            { value: 'expert', label: t.expert },
          ]}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 'min(88vw, 56vh, 420px)' }}>
          <PuzzlePanel
            puzzle={puzzle}
            resetSignal={resetSignal}
            onSolved={() => {
              alarmSound.playSuccess()
              setSolvedCount(count => count + 1)
              setTimeout(() => regenerate(), NEXT_PUZZLE_DELAY_MS)
            }}
          />
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 14, paddingBottom: 6 }}>
        <PressButton variant="ghost" onClick={() => setResetSignal(signal => signal + 1)}>
          {t.reset}
        </PressButton>
        <PressButton variant="dark" onClick={() => regenerate()}>
          {t.newPuzzle}
        </PressButton>
      </div>
    </div>
  )
}

// ===== EXPORT =====
export default PuzzleTest
