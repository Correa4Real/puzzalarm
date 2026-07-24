// internal — relative
import type { Puzzle, PuzzleType, Difficulty, SymmetryKind, TetrisShape, TriangleCount } from './types'
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
    expert: { cols: 6, rows: 6, minLen: 22 },
  },
  dots: {
    easy: { cols: 3, rows: 3, minLen: 7 },
    medium: { cols: 4, rows: 4, minLen: 11 },
    hard: { cols: 5, rows: 5, minLen: 16 },
    expert: { cols: 5, rows: 5, minLen: 17 },
  },
  squares: {
    easy: { cols: 2, rows: 2, minLen: 4 },
    medium: { cols: 3, rows: 3, minLen: 6 },
    hard: { cols: 4, rows: 4, minLen: 9 },
    expert: { cols: 4, rows: 4, minLen: 10 },
  },
  colors: {
    easy: { cols: 3, rows: 3, minLen: 8 },
    medium: { cols: 4, rows: 4, minLen: 10 },
    hard: { cols: 5, rows: 5, minLen: 14 },
    expert: { cols: 5, rows: 5, minLen: 15 },
  },
  symmetry: {
    easy: { cols: 5, rows: 3, minLen: 8 },
    medium: { cols: 5, rows: 4, minLen: 12 },
    hard: { cols: 5, rows: 5, minLen: 15 },
    expert: { cols: 5, rows: 5, minLen: 17 },
  },
  symhex: {
    easy: { cols: 5, rows: 3, minLen: 8 },
    medium: { cols: 5, rows: 4, minLen: 11 },
    hard: { cols: 5, rows: 5, minLen: 14 },
    expert: { cols: 5, rows: 5, minLen: 16 },
  },
  triangles: {
    easy: { cols: 3, rows: 3, minLen: 7 },
    medium: { cols: 4, rows: 4, minLen: 10 },
    hard: { cols: 5, rows: 5, minLen: 14 },
    expert: { cols: 5, rows: 5, minLen: 16 },
  },
  tetris: {
    easy: { cols: 3, rows: 3, minLen: 4 },
    medium: { cols: 4, rows: 4, minLen: 6 },
    hard: { cols: 5, rows: 5, minLen: 8 },
    expert: { cols: 5, rows: 5, minLen: 10 },
  },
  subtract: {
    easy: { cols: 4, rows: 4, minLen: 5 },
    medium: { cols: 4, rows: 4, minLen: 6 },
    hard: { cols: 5, rows: 5, minLen: 8 },
    expert: { cols: 5, rows: 5, minLen: 10 },
  },
}

const BrokenEdgeFraction: Record<Difficulty, number> = { easy: 0.45, medium: 0.5, hard: 0.55, expert: 0.58 }
const SymmetryBrokenFraction: Record<Difficulty, number> = { easy: 0.35, medium: 0.45, hard: 0.5, expert: 0.55 }
const DotCount: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 7, expert: 8 }
const SymhexDotCount: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4, expert: 5 }
const SquareDensity: Record<Difficulty, number> = { easy: 0.9, medium: 0.7, hard: 0.6, expert: 0.55 }
const ColorsMinRegions: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 3, expert: 4 }
const ColorsPaletteSize: Record<Difficulty, number> = { easy: 3, medium: 3, hard: 4, expert: 4 }
const TrianglesCellCountRange: Record<Difficulty, [number, number]> = {
  easy: [1, 2],
  medium: [2, 3],
  hard: [2, 3],
  expert: [4, 5],
}
const TetrisPieceCountRange: Record<Difficulty, [number, number]> = {
  easy: [2, 3],
  medium: [2, 4],
  hard: [3, 5],
  expert: [4, 6],
}
const SubtractYellowRange: Record<Difficulty, [number, number]> = {
  easy: [2, 2],
  medium: [2, 3],
  hard: [3, 4],
  expert: [3, 5],
}
const SubtractBlueCount: Record<Difficulty, number> = { easy: 1, medium: 1, hard: 2, expert: 3 }
const DOTS_BROKEN_FRACTION = 0.15
const SYMHEX_BROKEN_FRACTION = 0.3
const MAX_GENERATION_ATTEMPTS = 800
const MIN_SOLVE_FRACTION = 0.7
const SYMMETRY_MIN_SOLVE_FRACTION = 0.6
const MIN_SOLVE_FLOOR = 4

const CANONICAL_TETROMINOES: Array<Array<[number, number]>> = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [0, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [1, 1], [0, 2], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [0, 2]],
]

const MONOMINO: Array<Array<[number, number]>> = [
  [[0, 0]],
]

const DOMINOES: Array<Array<[number, number]>> = [
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
]

const STRAIGHT_TROMINOES: Array<Array<[number, number]>> = [
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
]

const CORNER_TROMINOES: Array<Array<[number, number]>> = [
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[1, 0], [0, 1], [1, 1]],
]

const POLYOMINO_POOL: Array<Array<[number, number]>> = [
  ...MONOMINO,
  ...DOMINOES,
  ...STRAIGHT_TROMINOES,
  ...CORNER_TROMINOES,
  ...CANONICAL_TETROMINOES,
]

// ===== UTILITIES =====
const randomInt = (n: number): number => Math.floor(Math.random() * n)

const randomInRange = (min: number, max: number): number => min + randomInt(max - min + 1)

const shuffle = <T,>(items: T[]): T[] => {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const emptyPuzzle = (base: Partial<Puzzle> & Pick<Puzzle, 'type' | 'cols' | 'rows' | 'start' | 'ends' | 'solution' | 'symmetryKind'>): Puzzle => ({
  brokenEdges: [],
  dots: [],
  mirrorDots: [],
  squares: {},
  triangles: {},
  tetris: {},
  tetrisBlue: {},
  ...base,
})

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

const cellEdgeKeys = (cell: number, cols: number): string[] => {
  const cx = cell % cols
  const cy = Math.floor(cell / cols)
  const tl = vertexAt(cx, cy, cols)
  const tr = vertexAt(cx + 1, cy, cols)
  const bl = vertexAt(cx, cy + 1, cols)
  const br = vertexAt(cx + 1, cy + 1, cols)
  return [edgeKey(tl, tr), edgeKey(bl, br), edgeKey(tl, bl), edgeKey(tr, br)]
}

const pathEdgesOnCell = (cell: number, cols: number, onPath: Set<string>): number =>
  cellEdgeKeys(cell, cols).filter(edge => onPath.has(edge)).length

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

const assignTriangles = (cols: number, rows: number, onPath: Set<string>, targetCount: number): Record<number, TriangleCount> | null => {
  const eligible: Array<{ cell: number; count: TriangleCount }> = []
  for (let cell = 0; cell < cols * rows; cell++) {
    const count = pathEdgesOnCell(cell, cols, onPath)
    if (count >= 1 && count <= 3) eligible.push({ cell, count: count as TriangleCount })
  }
  if (eligible.length < targetCount) return null
  const picked = shuffle(eligible).slice(0, targetCount)
  const triangles: Record<number, TriangleCount> = {}
  picked.forEach(entry => { triangles[entry.cell] = entry.count })
  return triangles
}

const feasiblePieceCount = (totalCells: number, pieceRange: [number, number]): boolean => {
  for (let pieces = pieceRange[0]; pieces <= pieceRange[1]; pieces++) {
    if (pieces <= totalCells && totalCells <= pieces * 4) return true
  }
  return false
}

const packRegionMixed = (
  region: number[], cols: number, rows: number,
  pieceRange: [number, number], maxOverlap: number,
): number[][] | null => {
  const regionSet = new Set(region)
  const placements: number[][] = []
  const coverage = new Map<number, number>()
  let overlapUsed = 0
  const [minPieces, maxPieces] = pieceRange

  const tryPlace = (): boolean => {
    let target: number | undefined
    for (const c of region) if ((coverage.get(c) ?? 0) === 0) { target = c; break }
    if (target === undefined) {
      if (overlapUsed < maxOverlap) {
        if (placements.length >= maxPieces) return false
        target = region[randomInt(region.length)]
      } else {
        return placements.length >= minPieces && placements.length <= maxPieces
      }
    } else if (placements.length >= maxPieces) {
      return false
    }
    const tx = target % cols
    const ty = Math.floor(target / cols)
    for (const shape of shuffle(POLYOMINO_POOL)) {
      for (const [ax, ay] of shuffle(shape)) {
        const originX = tx - ax
        const originY = ty - ay
        const placedCells: number[] = []
        let ok = true
        let newOverlap = 0
        for (const [dx, dy] of shape) {
          const nx = originX + dx
          const ny = originY + dy
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) { ok = false; break }
          const c = ny * cols + nx
          if (!regionSet.has(c)) { ok = false; break }
          if ((coverage.get(c) ?? 0) > 0) newOverlap += 1
          placedCells.push(c)
        }
        if (!ok) continue
        if (overlapUsed + newOverlap > maxOverlap) continue
        let capExceeded = false
        for (const c of placedCells) if ((coverage.get(c) ?? 0) >= 2) { capExceeded = true; break }
        if (capExceeded) continue
        placedCells.forEach(c => coverage.set(c, (coverage.get(c) ?? 0) + 1))
        placements.push(placedCells)
        overlapUsed += newOverlap
        if (tryPlace()) return true
        placedCells.forEach(c => coverage.set(c, coverage.get(c)! - 1))
        placements.pop()
        overlapUsed -= newOverlap
      }
    }
    return false
  }

  if (tryPlace()) return placements.map(p => [...p])
  return null
}

const shapeFromCells = (cells: number[], anchorCell: number, cols: number): TetrisShape => {
  const ax = anchorCell % cols
  const ay = Math.floor(anchorCell / cols)
  return {
    cells: cells.map(cell => {
      const cx = cell % cols
      const cy = Math.floor(cell / cols)
      return [cx - ax, cy - ay] as [number, number]
    }),
  }
}

const pickAnchor = (piece: number[], used: Set<number>): number | null => {
  for (const cell of piece) if (!used.has(cell)) return cell
  return null
}

const assignTetrisMixed = (regions: number[][], cols: number, rows: number, pieceRange: [number, number]): Record<number, TetrisShape> | null => {
  const candidates = shuffle(regions.filter(region => feasiblePieceCount(region.length, pieceRange)))
  for (const region of candidates) {
    const placements = packRegionMixed(region, cols, rows, pieceRange, 0)
    if (!placements) continue
    const yellow: Record<number, TetrisShape> = {}
    const usedAnchors = new Set<number>()
    let ok = true
    for (const piece of placements) {
      const anchor = pickAnchor(piece, usedAnchors)
      if (anchor === null) { ok = false; break }
      usedAnchors.add(anchor)
      yellow[anchor] = shapeFromCells(piece, anchor, cols)
    }
    if (ok) return yellow
  }
  return null
}

const assignSubtract = (
  regions: number[][], cols: number, rows: number, yellowRange: [number, number], blueCount: number,
): { yellow: Record<number, TetrisShape>; blue: Record<number, TetrisShape> } | null => {
  const candidates = shuffle(regions.filter(region => feasiblePieceCount(region.length + blueCount, yellowRange)))
  for (const region of candidates) {
    const placements = packRegionMixed(region, cols, rows, yellowRange, blueCount)
    if (!placements) continue
    const coverage = new Map<number, number>()
    placements.forEach(piece => piece.forEach(cell => coverage.set(cell, (coverage.get(cell) ?? 0) + 1)))
    const overlapCells = new Set<number>()
    for (const [cell, count] of coverage) if (count === 2) overlapCells.add(cell)
    if (overlapCells.size !== blueCount) continue
    const yellow: Record<number, TetrisShape> = {}
    const usedAnchors = new Set<number>([...overlapCells])
    let ok = true
    for (const piece of placements) {
      const anchor = pickAnchor(piece, usedAnchors)
      if (anchor === null) { ok = false; break }
      usedAnchors.add(anchor)
      yellow[anchor] = shapeFromCells(piece, anchor, cols)
    }
    if (!ok) continue
    const blue: Record<number, TetrisShape> = {}
    for (const cell of overlapCells) blue[cell] = { cells: [[0, 0]] }
    return { yellow, blue }
  }
  return null
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

const applyExpertLayer = (puzzle: Puzzle, onPath: Set<string>, diff: Difficulty): void => {
  if (diff !== 'expert') return
  const type = puzzle.type
  if (type === 'maze' || type === 'dots' || type === 'squares' || type === 'colors') {
    const extra = assignTriangles(puzzle.cols, puzzle.rows, onPath, TrianglesCellCountRange[diff][0])
    if (extra) Object.assign(puzzle.triangles, extra)
  } else if (type === 'tetris' || type === 'subtract') {
    const pathList = shuffle([...onPath])
    pathList.slice(0, 2).forEach(edge => puzzle.dots.push(`e:${edge}`))
  }
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
    const base = emptyPuzzle({ type, cols, rows, start, ends: [end], solution, symmetryKind: kind })
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

  const base = emptyPuzzle({ type, cols, rows, start, ends: [end], solution, symmetryKind: 'horizontal' })
  const keepClear = protectedEndpoints(base)

  if (type === 'maze') {
    const removable = shuffle(
      allEdges(cols, rows).filter(edge => !onPath.has(edge) && !touchesVertices(edge, keepClear)),
    )
    base.brokenEdges = removable.slice(0, Math.floor(removable.length * BrokenEdgeFraction[diff]))
    if (shortestSolveDistance(base) < Math.max(MIN_SOLVE_FLOOR, Math.round(minLen * MIN_SOLVE_FRACTION))) {
      return null
    }
    applyExpertLayer(base, onPath, diff)
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
    applyExpertLayer(base, onPath, diff)
    return base
  }

  if (type === 'triangles') {
    const [minCells, maxCells] = TrianglesCellCountRange[diff]
    const target = randomInRange(minCells, maxCells)
    const triangles = assignTriangles(cols, rows, onPath, target)
    if (!triangles) return null
    base.triangles = triangles
    return base
  }

  const regions = cellRegions(cols, rows, solution)

  if (type === 'tetris') {
    const yellow = assignTetrisMixed(regions, cols, rows, TetrisPieceCountRange[diff])
    if (!yellow) return null
    base.tetris = yellow
    applyExpertLayer(base, onPath, diff)
    return base
  }

  if (type === 'subtract') {
    const result = assignSubtract(regions, cols, rows, SubtractYellowRange[diff], SubtractBlueCount[diff])
    if (!result) return null
    base.tetris = result.yellow
    base.tetrisBlue = result.blue
    applyExpertLayer(base, onPath, diff)
    return base
  }

  if (type === 'colors') {
    if (regions.length < ColorsMinRegions[diff]) return null
    const squares = assignRegionColors(regions, ColorsPaletteSize[diff], SquareDensity[diff])
    if (!squares) return null
    base.squares = squares
    applyExpertLayer(base, onPath, diff)
    return base
  }

  if (regions.length < 2) return null
  const squares = assignRegionColors(regions, 2, SquareDensity[diff])
  if (!squares) return null
  base.squares = squares
  applyExpertLayer(base, onPath, diff)
  return base
}

const canTileRegion = (
  region: number[],
  pieces: Array<{ shape: TetrisShape; sign: 1 | -1 }>,
  cols: number,
  rows: number,
): boolean => {
  const totalSigned = pieces.reduce((sum, piece) => sum + piece.shape.cells.length * piece.sign, 0)
  if (totalSigned !== region.length) return false
  const regionSet = new Set(region)
  const coverage = new Map<number, number>()
  const used = new Array(pieces.length).fill(false)

  const tryFill = (): boolean => {
    let target: number | undefined
    for (const c of region) {
      const cov = coverage.get(c) ?? 0
      if (cov !== 1) { target = c; break }
    }
    if (target === undefined) return used.every(u => u)
    const targetCov = coverage.get(target) ?? 0
    const needsPositive = targetCov < 1
    const tx = target % cols
    const ty = Math.floor(target / cols)
    for (let i = 0; i < pieces.length; i++) {
      if (used[i]) continue
      const piece = pieces[i]
      if (needsPositive && piece.sign !== 1) continue
      if (!needsPositive && piece.sign !== -1) continue
      for (const [refDx, refDy] of piece.shape.cells) {
        const originX = tx - refDx
        const originY = ty - refDy
        const placedCells: number[] = []
        let ok = true
        for (const [dx, dy] of piece.shape.cells) {
          const nx = originX + dx
          const ny = originY + dy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { ok = false; break }
          const c = ny * cols + nx
          if (!regionSet.has(c)) { ok = false; break }
          placedCells.push(c)
        }
        if (!ok) continue
        used[i] = true
        placedCells.forEach(c => coverage.set(c, (coverage.get(c) ?? 0) + piece.sign))
        if (tryFill()) return true
        placedCells.forEach(c => coverage.set(c, coverage.get(c)! - piece.sign))
        used[i] = false
      }
    }
    return false
  }

  return tryFill()
}

const sanityCheckSolution = (puzzle: Puzzle): boolean => {
  const hasPieces = Object.keys(puzzle.tetris).length > 0 || Object.keys(puzzle.tetrisBlue).length > 0
  if (!hasPieces) return true
  const regions = cellRegions(puzzle.cols, puzzle.rows, puzzle.solution)
  for (const region of regions) {
    const yellowAnchors = region.filter(cell => puzzle.tetris[cell] !== undefined)
    const blueAnchors = region.filter(cell => puzzle.tetrisBlue[cell] !== undefined)
    if (yellowAnchors.length === 0 && blueAnchors.length === 0) continue
    const pieces: Array<{ shape: TetrisShape; sign: 1 | -1 }> = []
    for (const a of yellowAnchors) pieces.push({ shape: puzzle.tetris[a], sign: 1 })
    for (const a of blueAnchors) pieces.push({ shape: puzzle.tetrisBlue[a], sign: -1 })
    if (!canTileRegion(region, pieces, puzzle.cols, puzzle.rows)) return false
  }
  return true
}

const generatePuzzle = (type: PuzzleType, diff: Difficulty): Puzzle => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const puzzle = tryGenerate(type, diff)
    if (puzzle && sanityCheckSolution(puzzle)) return puzzle
  }
  const { cols, rows } = SizeTable.maze.easy
  const start = vertexAt(0, rows, cols)
  const end = vertexAt(cols, 0, cols)
  const solution = randomPath(cols, rows, start, end, 3)!
  return emptyPuzzle({ type: 'maze', cols, rows, start, ends: [end], solution, symmetryKind: 'horizontal' })
}

const easePuzzle = (puzzle: Puzzle): Puzzle => {
  const eased: Puzzle = {
    ...puzzle,
    ends: [...puzzle.ends],
    brokenEdges: [...puzzle.brokenEdges],
    dots: [...puzzle.dots],
    mirrorDots: [...puzzle.mirrorDots],
    squares: { ...puzzle.squares },
    triangles: { ...puzzle.triangles },
    tetris: { ...puzzle.tetris },
    tetrisBlue: { ...puzzle.tetrisBlue },
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
  } else if (puzzle.type === 'triangles') {
    const keys = Object.keys(eased.triangles).map(Number)
    if (keys.length > 1) {
      const remove = keys.slice(0, keys.length - 1)
      shuffle(remove).slice(0, Math.floor(remove.length / 2)).forEach(key => delete eased.triangles[key])
    }
  } else if (puzzle.type === 'subtract') {
    eased.tetrisBlue = {}
  } else if (puzzle.type !== 'tetris') {
    const keys = Object.keys(eased.squares).map(Number)
    shuffle(keys).slice(0, Math.floor(keys.length / 2)).forEach(key => delete eased.squares[key])
  }
  return eased
}

// ===== EXPORT =====
export { generatePuzzle, easePuzzle, cellRegions, cellEdgeKeys, pathEdges, pathEdgesOnCell, canTileRegion }
