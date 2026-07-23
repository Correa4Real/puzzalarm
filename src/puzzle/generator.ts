// internal — relative
import type { Puzzle, PuzzleType, Difficulty, SymmetryKind } from './types'
import { edgeKey, vertexAt, vertexXY, neighbors, isBorder, mirrorVertex, mirrorEdgeKey } from './types'

// ===== CONFIGURATIONS =====
interface SizeSpec {
  cols: number
  rows: number
  minLen: number
}

const SizeTable: Record<PuzzleType, Record<Difficulty, SizeSpec>> = {
  maze: {
    easy: { cols: 4, rows: 4, minLen: 9 },
    medium: { cols: 5, rows: 5, minLen: 14 },
    hard: { cols: 6, rows: 6, minLen: 20 },
  },
  dots: {
    easy: { cols: 3, rows: 3, minLen: 7 },
    medium: { cols: 4, rows: 4, minLen: 11 },
    hard: { cols: 5, rows: 5, minLen: 16 },
  },
  squares: {
    easy: { cols: 2, rows: 2, minLen: 4 },
    medium: { cols: 3, rows: 3, minLen: 6 },
    hard: { cols: 4, rows: 4, minLen: 9 },
  },
  colors: {
    easy: { cols: 3, rows: 3, minLen: 8 },
    medium: { cols: 4, rows: 4, minLen: 10 },
    hard: { cols: 5, rows: 5, minLen: 14 },
  },
  symmetry: {
    easy: { cols: 5, rows: 3, minLen: 8 },
    medium: { cols: 5, rows: 4, minLen: 12 },
    hard: { cols: 5, rows: 5, minLen: 15 },
  },
  symhex: {
    easy: { cols: 5, rows: 3, minLen: 8 },
    medium: { cols: 5, rows: 4, minLen: 11 },
    hard: { cols: 5, rows: 5, minLen: 14 },
  },
}

const BrokenEdgeFraction: Record<Difficulty, number> = { easy: 0.45, medium: 0.5, hard: 0.55 }
const SymmetryBrokenFraction: Record<Difficulty, number> = { easy: 0.35, medium: 0.45, hard: 0.5 }
const DotCount: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 7 }
const SymhexDotCount: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 }
const SquareDensity: Record<Difficulty, number> = { easy: 0.9, medium: 0.7, hard: 0.6 }
const ColorsMinRegions: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 3 }
const ColorsPaletteSize: Record<Difficulty, number> = { easy: 3, medium: 3, hard: 4 }
const DOTS_BROKEN_FRACTION = 0.15
const SYMHEX_BROKEN_FRACTION = 0.3
const MAX_GENERATION_ATTEMPTS = 800
const MIN_SOLVE_FRACTION = 0.7
const SYMMETRY_MIN_SOLVE_FRACTION = 0.6
const MIN_SOLVE_FLOOR = 4

// ===== UTILITIES =====
const randomInt = (n: number): number => Math.floor(Math.random() * n)

const shuffle = <T,>(items: T[]): T[] => {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const randomPath = (cols: number, rows: number, start: number, end: number, minLen: number): number[] | null => {
  const path: number[] = [start]
  const visited = new Set<number>([start])

  const dfs = (v: number): boolean => {
    if (v === end && path.length - 1 >= minLen) return true
    if (path.length > (cols + 1) * (rows + 1)) return false
    for (const next of shuffle(neighbors(v, cols, rows))) {
      if (visited.has(next)) continue
      if (next === end && path.length < minLen) continue
      visited.add(next)
      path.push(next)
      if (dfs(next)) return true
      path.pop()
      visited.delete(next)
    }
    return false
  }

  return dfs(start) ? path : null
}

const randomSymmetricPath = (
  cols: number, rows: number, start: number, end: number, minLen: number, kind: SymmetryKind,
): number[] | null => {
  const path: number[] = [start]
  const visited = new Set<number>([start, mirrorVertex(start, cols, rows, kind)])

  const dfs = (v: number): boolean => {
    if (v === end && path.length - 1 >= minLen) return true
    if (path.length > (cols + 1) * (rows + 1)) return false
    for (const next of shuffle(neighbors(v, cols, rows))) {
      if (visited.has(next)) continue
      if (next === end && path.length < minLen) continue
      const mirrored = mirrorVertex(next, cols, rows, kind)
      if (mirrored === next) continue
      visited.add(next)
      visited.add(mirrored)
      path.push(next)
      if (dfs(next)) return true
      path.pop()
      visited.delete(next)
      visited.delete(mirrored)
    }
    return false
  }

  return dfs(start) ? path : null
}

const pathEdges = (path: number[]): Set<string> => {
  const edges = new Set<string>()
  for (let i = 1; i < path.length; i++) edges.add(edgeKey(path[i - 1], path[i]))
  return edges
}

const allEdges = (cols: number, rows: number): string[] => {
  const result: string[] = []
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      const v = vertexAt(x, y, cols)
      if (x < cols) result.push(edgeKey(v, vertexAt(x + 1, y, cols)))
      if (y < rows) result.push(edgeKey(v, vertexAt(x, y + 1, cols)))
    }
  }
  return result
}

const touchesVertices = (edge: string, protectedVertices: Set<number>): boolean => {
  const [a, b] = edge.split('-').map(Number)
  return protectedVertices.has(a) || protectedVertices.has(b)
}

const cellRegions = (cols: number, rows: number, path: number[]): number[][] => {
  const onPath = pathEdges(path)
  const seen = new Set<number>()
  const regions: number[][] = []
  for (let cell = 0; cell < cols * rows; cell++) {
    if (seen.has(cell)) continue
    const region: number[] = []
    const queue = [cell]
    seen.add(cell)
    while (queue.length) {
      const current = queue.pop()!
      region.push(current)
      const cx = current % cols
      const cy = Math.floor(current / cols)
      const tryMove = (nx: number, ny: number, wallA: number, wallB: number) => {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return
        const neighborCell = ny * cols + nx
        if (seen.has(neighborCell)) return
        if (onPath.has(edgeKey(wallA, wallB))) return
        seen.add(neighborCell)
        queue.push(neighborCell)
      }
      tryMove(cx + 1, cy, vertexAt(cx + 1, cy, cols), vertexAt(cx + 1, cy + 1, cols))
      tryMove(cx - 1, cy, vertexAt(cx, cy, cols), vertexAt(cx, cy + 1, cols))
      tryMove(cx, cy + 1, vertexAt(cx, cy + 1, cols), vertexAt(cx + 1, cy + 1, cols))
      tryMove(cx, cy - 1, vertexAt(cx, cy, cols), vertexAt(cx + 1, cy, cols))
    }
    regions.push(region)
  }
  return regions
}

const pickStartEnd = (cols: number, rows: number): { start: number; end: number } => {
  const start = vertexAt(0, rows, cols)
  const endOptions: number[] = []
  for (let x = 1; x <= cols; x++) endOptions.push(vertexAt(x, 0, cols))
  for (let y = 1; y < rows; y++) endOptions.push(vertexAt(cols, y, cols))
  return { start, end: endOptions[randomInt(endOptions.length)] }
}

const assignRegionColors = (regions: number[][], paletteSize: number, density: number): Record<number, number> | null => {
  const squares: Record<number, number> = {}
  const colorOrder = shuffle(Array.from({ length: paletteSize }, (_, i) => i))
  const used = new Set<number>()
  regions.forEach((region, index) => {
    const color = colorOrder[index % colorOrder.length]
    const cells = shuffle(region)
    const take = Math.max(1, Math.round(cells.length * density))
    cells.slice(0, take).forEach(cell => {
      squares[cell] = color
      used.add(color)
    })
  })
  return used.size >= 2 ? squares : null
}

const shortestSolveDistance = (puzzle: Puzzle): number => {
  const broken = new Set(puzzle.brokenEdges)
  const isMirrorType = puzzle.type === 'symmetry' || puzzle.type === 'symhex'
  const targets = new Set(puzzle.ends)
  if (isMirrorType) {
    puzzle.ends.forEach(end => targets.add(mirrorVertex(end, puzzle.cols, puzzle.rows, puzzle.symmetryKind)))
  }
  const edgeUsable = (a: number, b: number): boolean => {
    const key = edgeKey(a, b)
    if (broken.has(key)) return false
    if (isMirrorType && broken.has(mirrorEdgeKey(key, puzzle.cols, puzzle.rows, puzzle.symmetryKind))) return false
    return true
  }
  const dist = new Map<number, number>([[puzzle.start, 0]])
  const queue = [puzzle.start]
  while (queue.length) {
    const v = queue.shift()!
    const d = dist.get(v)!
    if (targets.has(v)) return d
    for (const next of neighbors(v, puzzle.cols, puzzle.rows)) {
      if (dist.has(next) || !edgeUsable(v, next)) continue
      dist.set(next, d + 1)
      queue.push(next)
    }
  }
  return Infinity
}

const protectedEndpoints = (puzzle: Pick<Puzzle, 'type' | 'cols' | 'rows' | 'start' | 'ends' | 'symmetryKind'>): Set<number> => {
  const vertices = new Set<number>([puzzle.start, ...puzzle.ends])
  if (puzzle.type === 'symmetry' || puzzle.type === 'symhex') {
    vertices.add(mirrorVertex(puzzle.start, puzzle.cols, puzzle.rows, puzzle.symmetryKind))
    puzzle.ends.forEach(end => vertices.add(mirrorVertex(end, puzzle.cols, puzzle.rows, puzzle.symmetryKind)))
  }
  return vertices
}

// ===== SERVICE =====
const tryGenerate = (type: PuzzleType, diff: Difficulty): Puzzle | null => {
  const { cols, rows, minLen } = SizeTable[type][diff]
  const { start, end } = pickStartEnd(cols, rows)

  if (type === 'symmetry' || type === 'symhex') {
    const kind: SymmetryKind = randomInt(2) === 0 ? 'horizontal' : 'rotational'
    const mirroredStart = mirrorVertex(start, cols, rows, kind)
    if (end === mirroredStart || mirrorVertex(end, cols, rows, kind) === start) return null
    const solution = randomSymmetricPath(cols, rows, start, end, minLen, kind)
    if (!solution) return null
    const onPath = pathEdges(solution)
    const onMirror = new Set([...onPath].map(edge => mirrorEdgeKey(edge, cols, rows, kind)))
    const base: Puzzle = {
      type, cols, rows, start, ends: [end],
      brokenEdges: [], dots: [], mirrorDots: [], squares: {}, solution, symmetryKind: kind,
    }
    const keepClear = protectedEndpoints(base)
    const removable = shuffle(
      allEdges(cols, rows).filter(
        edge => !onPath.has(edge) && !onMirror.has(edge) && !touchesVertices(edge, keepClear),
      ),
    )
    const fraction = type === 'symmetry' ? SymmetryBrokenFraction[diff] : SYMHEX_BROKEN_FRACTION
    base.brokenEdges = removable.slice(0, Math.floor(removable.length * fraction))

    if (type === 'symhex') {
      const count = SymhexDotCount[diff]
      const mainEdges = shuffle([...onPath])
      const mirrorEdges = shuffle([...onMirror])
      if (mainEdges.length < count || mirrorEdges.length < count) return null
      base.dots = mainEdges.slice(0, count).map(edge => `e:${edge}`)
      base.mirrorDots = mirrorEdges.slice(0, count).map(edge => `e:${edge}`)
    }
    if (type === 'symmetry' && shortestSolveDistance(base) < Math.max(MIN_SOLVE_FLOOR, Math.round(minLen * SYMMETRY_MIN_SOLVE_FRACTION))) {
      return null
    }
    return base
  }

  const solution = randomPath(cols, rows, start, end, minLen)
  if (!solution) return null
  const onPath = pathEdges(solution)

  const base: Puzzle = {
    type, cols, rows, start, ends: [end],
    brokenEdges: [], dots: [], mirrorDots: [], squares: {}, solution, symmetryKind: 'horizontal',
  }
  const keepClear = protectedEndpoints(base)

  if (type === 'maze') {
    const removable = shuffle(
      allEdges(cols, rows).filter(edge => !onPath.has(edge) && !touchesVertices(edge, keepClear)),
    )
    base.brokenEdges = removable.slice(0, Math.floor(removable.length * BrokenEdgeFraction[diff]))
    if (shortestSolveDistance(base) < Math.max(MIN_SOLVE_FLOOR, Math.round(minLen * MIN_SOLVE_FRACTION))) {
      return null
    }
    return base
  }

  if (type === 'dots') {
    const edges = shuffle([...onPath])
    const count = DotCount[diff]
    if (edges.length < count) return null
    base.dots = edges.slice(0, count).map(edge => `e:${edge}`)
    const removable = shuffle(
      allEdges(cols, rows).filter(edge => !onPath.has(edge) && !touchesVertices(edge, keepClear)),
    )
    base.brokenEdges = removable.slice(0, Math.floor(removable.length * DOTS_BROKEN_FRACTION))
    return base
  }

  const regions = cellRegions(cols, rows, solution)
  if (type === 'colors') {
    if (regions.length < ColorsMinRegions[diff]) return null
    const squares = assignRegionColors(regions, ColorsPaletteSize[diff], SquareDensity[diff])
    if (!squares) return null
    base.squares = squares
    return base
  }

  if (regions.length < 2) return null
  const squares = assignRegionColors(regions, 2, SquareDensity[diff])
  if (!squares) return null
  base.squares = squares
  return base
}

const generatePuzzle = (type: PuzzleType, diff: Difficulty): Puzzle => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const puzzle = tryGenerate(type, diff)
    if (puzzle) return puzzle
  }
  const { cols, rows } = SizeTable.maze.easy
  const start = vertexAt(0, rows, cols)
  const end = vertexAt(cols, 0, cols)
  const solution = randomPath(cols, rows, start, end, 3)!
  return {
    type: 'maze', cols, rows, start, ends: [end],
    brokenEdges: [], dots: [], mirrorDots: [], squares: {}, solution, symmetryKind: 'horizontal',
  }
}

const easePuzzle = (puzzle: Puzzle): Puzzle => {
  const eased: Puzzle = {
    ...puzzle,
    ends: [...puzzle.ends],
    brokenEdges: [...puzzle.brokenEdges],
    dots: [...puzzle.dots],
    mirrorDots: [...puzzle.mirrorDots],
    squares: { ...puzzle.squares },
  }
  if (puzzle.type === 'maze' || puzzle.type === 'symmetry') {
    const startPos = vertexXY(puzzle.start, puzzle.cols)
    const isMirrorType = puzzle.type === 'symmetry'
    const candidates = [
      vertexAt(Math.min(startPos.x + 2, puzzle.cols), startPos.y, puzzle.cols),
      vertexAt(startPos.x, Math.max(startPos.y - 2, 0), puzzle.cols),
    ].filter(v =>
      isBorder(v, puzzle.cols, puzzle.rows) &&
      v !== puzzle.start &&
      !puzzle.ends.includes(v) &&
      (!isMirrorType || mirrorVertex(v, puzzle.cols, puzzle.rows, puzzle.symmetryKind) !== v),
    )
    if (candidates.length) eased.ends.push(candidates[0])
    eased.brokenEdges = eased.brokenEdges.slice(0, Math.floor(eased.brokenEdges.length / 2))
    const keepClear = protectedEndpoints(eased)
    eased.brokenEdges = eased.brokenEdges.filter(edge => !touchesVertices(edge, keepClear))
  } else if (puzzle.type === 'dots' || puzzle.type === 'symhex') {
    eased.dots = eased.dots.slice(0, Math.max(1, Math.ceil(eased.dots.length / 2)))
    eased.mirrorDots = eased.mirrorDots.slice(0, Math.max(1, Math.ceil(eased.mirrorDots.length / 2)))
    if (puzzle.type === 'dots') eased.brokenEdges = []
  } else {
    const keys = Object.keys(eased.squares).map(Number)
    shuffle(keys).slice(0, Math.floor(keys.length / 2)).forEach(key => delete eased.squares[key])
  }
  return eased
}

// ===== EXPORT =====
export { generatePuzzle, easePuzzle, cellRegions }
