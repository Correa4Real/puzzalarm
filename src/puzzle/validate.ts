// internal — relative
import type { Puzzle, TetrisShape } from './types'
import { mirrorEdgeKey } from './types'
import { cellRegions, cellEdgeKeys, pathEdges as pathEdgesOf, canTileRegion } from './generator'

// ===== TYPES =====
export interface Violations {
  dots: string[]
  mirrorDots: string[]
  squareCells: number[]
  triangleCells: number[]
  tetrisCells: number[]
}

// ===== UTILITIES =====
const triangleViolations = (puzzle: Puzzle, onPath: Set<string>): number[] => {
  const result: number[] = []
  for (const [cell, count] of Object.entries(puzzle.triangles)) {
    const numeric = Number(cell)
    if (cellEdgeKeys(numeric, puzzle.cols).filter(edge => onPath.has(edge)).length !== count) {
      result.push(numeric)
    }
  }
  return result
}

const tetrisViolations = (puzzle: Puzzle, regions: number[][]): number[] => {
  const result: number[] = []
  for (const region of regions) {
    const yellowAnchors = region.filter(cell => puzzle.tetris[cell] !== undefined)
    const blueAnchors = region.filter(cell => puzzle.tetrisBlue[cell] !== undefined)
    if (yellowAnchors.length === 0 && blueAnchors.length === 0) continue
    const pieces: Array<{ shape: TetrisShape; sign: 1 | -1 }> = []
    for (const a of yellowAnchors) pieces.push({ shape: puzzle.tetris[a], sign: 1 })
    for (const a of blueAnchors) pieces.push({ shape: puzzle.tetrisBlue[a], sign: -1 })
    if (!canTileRegion(region, pieces, puzzle.cols, puzzle.rows)) {
      result.push(...yellowAnchors, ...blueAnchors)
    }
  }
  return result
}

// ===== SERVICE =====
const validatePath = (puzzle: Puzzle, path: number[]): boolean => {
  if (path.length < 2) return false
  if (path[0] !== puzzle.start) return false
  if (!puzzle.ends.includes(path[path.length - 1])) return false

  const edges = pathEdgesOf(path)

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

  const hasRegionRule =
    Object.keys(puzzle.squares).length > 0 ||
    Object.keys(puzzle.tetris).length > 0 ||
    Object.keys(puzzle.tetrisBlue).length > 0
  if (hasRegionRule) {
    const regions = cellRegions(puzzle.cols, puzzle.rows, path)
    if (Object.keys(puzzle.squares).length > 0) {
      for (const region of regions) {
        const colorsInRegion = new Set<number>()
        for (const cell of region) {
          if (puzzle.squares[cell] !== undefined) colorsInRegion.add(puzzle.squares[cell])
        }
        if (colorsInRegion.size > 1) return false
      }
    }
    if ((Object.keys(puzzle.tetris).length > 0 || Object.keys(puzzle.tetrisBlue).length > 0) && tetrisViolations(puzzle, regions).length > 0) return false
  }

  if (Object.keys(puzzle.triangles).length > 0 && triangleViolations(puzzle, edges).length > 0) return false

  return true
}

const findViolations = (puzzle: Puzzle, path: number[]): Violations => {
  const edges = pathEdgesOf(path)

  const dots = puzzle.dots.filter(dot => {
    if (dot.startsWith('v:')) return !path.includes(Number(dot.slice(2)))
    return !edges.has(dot.slice(2))
  })

  const mirrorDots = puzzle.mirrorDots.filter(
    dot => !edges.has(mirrorEdgeKey(dot.slice(2), puzzle.cols, puzzle.rows, puzzle.symmetryKind)),
  )

  const squareCells: number[] = []
  const tetrisCells: number[] = []
  const hasRegionRule =
    Object.keys(puzzle.squares).length > 0 ||
    Object.keys(puzzle.tetris).length > 0 ||
    Object.keys(puzzle.tetrisBlue).length > 0
  if (hasRegionRule) {
    const regions = cellRegions(puzzle.cols, puzzle.rows, path)
    if (Object.keys(puzzle.squares).length > 0) {
      for (const region of regions) {
        const colorsInRegion = new Set<number>()
        for (const cell of region) {
          if (puzzle.squares[cell] !== undefined) colorsInRegion.add(puzzle.squares[cell])
        }
        if (colorsInRegion.size > 1) {
          for (const cell of region) if (puzzle.squares[cell] !== undefined) squareCells.push(cell)
        }
      }
    }
    if (Object.keys(puzzle.tetris).length > 0 || Object.keys(puzzle.tetrisBlue).length > 0) {
      tetrisCells.push(...tetrisViolations(puzzle, regions))
    }
  }

  const triangleCells = Object.keys(puzzle.triangles).length > 0 ? triangleViolations(puzzle, edges) : []

  return { dots, mirrorDots, squareCells, triangleCells, tetrisCells }
}

// ===== EXPORT =====
export { validatePath, findViolations }
