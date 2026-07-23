import { generatePuzzle, easePuzzle } from '../src/puzzle/generator'
import { validatePath } from '../src/puzzle/validate'
import type { PuzzleType, Difficulty } from '../src/puzzle/types'

const types: PuzzleType[] = ['maze', 'dots', 'squares', 'colors', 'symmetry', 'symhex']
const diffs: Difficulty[] = ['easy', 'medium', 'hard']

let fails = 0
for (const ty of types) {
  for (const d of diffs) {
    for (let i = 0; i < 300; i++) {
      const p = generatePuzzle(ty, d)
      if (p.type !== ty) {
        console.error(`FALLBACK used for ${ty}/${d}`)
        fails++
        continue
      }
      if (!validatePath(p, p.solution)) {
        console.error(`INVALID solution for ${ty}/${d}`, JSON.stringify(p))
        fails++
      }
      const eased = easePuzzle(p)
      if (!validatePath(eased, p.solution)) {
        console.error(`EASED broke original solution for ${ty}/${d}`)
        fails++
      }
    }
    console.log(`ok: ${ty}/${d} x300`)
  }
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`)
process.exit(fails === 0 ? 0 : 1)
