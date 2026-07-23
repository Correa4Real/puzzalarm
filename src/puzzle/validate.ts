// internal — relative
import type { Puzzle } from './types'
import { edgeKey, mirrorEdgeKey } from './types'
import { cellRegions } from './generator'

// ===== SERVICE =====
const validatePath = (puzzle: Puzzle, path: number[]): boolean => {
  if (path.length < 2) return false
  if (path[0] !== puzzle.start) return false
  if (!puzzle.ends.includes(path[path.length - 1])) return false

  const edges = new Set<string>()
  for (let i = 1; i < path.length; i++) edges.add(edgeKey(path[i - 1], path[i]))

  for (const dot of puzzle.dots) {
    if (dot.startsWith('v:')) {
      if (!path.includes(Number(dot.slice(2)))) return false
    } else {
      if (!edges.has(dot.slice(2))) return false
    }
  }

  for (const dot of puzzle.mirrorDots) {
    if (!edges.has(mirrorEdgeKey(dot.slice(2), puzzle.cols, puzzle.rows, puzzle.symmetryKind))) return false
  }

  const markedCells = Object.keys(puzzle.squares).map(Number)
  if (markedCells.length > 0) {
    for (const region of cellRegions(puzzle.cols, puzzle.rows, path)) {
      const colorsInRegion = new Set<number>()
      for (const cell of region) {
        if (puzzle.squares[cell] !== undefined) colorsInRegion.add(puzzle.squares[cell])
      }
      if (colorsInRegion.size > 1) return false
    }
  }

  return true
}

// ===== TYPES =====
export interface Violations {
  dots: string[]
  mirrorDots: string[]
  squareCells: number[]
}

// ===== UTILITIES =====
const findViolations = (puzzle: Puzzle, path: number[]): Violations => {
  const edges = new Set<string>()
  for (let i = 1; i < path.length; i++) edges.add(edgeKey(path[i - 1], path[i]))

  const dots = puzzle.dots.filter(dot => {
    if (dot.startsWith('v:')) return !path.includes(Number(dot.slice(2)))
    return !edges.has(dot.slice(2))
  })

  const mirrorDots = puzzle.mirrorDots.filter(
    dot => !edges.has(mirrorEdgeKey(dot.slice(2), puzzle.cols, puzzle.rows, puzzle.symmetryKind)),
  )

  const squareCells: number[] = []
  if (Object.keys(puzzle.squares).length > 0) {
    for (const region of cellRegions(puzzle.cols, puzzle.rows, path)) {
      const colorsInRegion = new Set<number>()
      for (const cell of region) {
        if (puzzle.squares[cell] !== undefined) colorsInRegion.add(puzzle.squares[cell])
      }
      if (colorsInRegion.size > 1) {
        for (const cell of region) {
          if (puzzle.squares[cell] !== undefined) squareCells.push(cell)
        }
      }
    }
  }

  return { dots, mirrorDots, squareCells }
}

// ===== EXPORT =====
export { validatePath, findViolations }
