// ===== TYPES =====
export type PuzzleType = 'maze' | 'dots' | 'squares' | 'colors' | 'symmetry' | 'symhex' | 'triangles' | 'tetris' | 'subtract'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type SymmetryKind = 'horizontal' | 'rotational'
export type TriangleCount = 1 | 2 | 3

export interface Vertex {
  x: number
  y: number
}

export interface TetrisShape {
  cells: Array<[number, number]>
}

export interface Puzzle {
  type: PuzzleType
  cols: number
  rows: number
  start: number
  ends: number[]
  brokenEdges: string[]
  dots: string[]
  mirrorDots: string[]
  squares: Record<number, number>
  triangles: Record<number, TriangleCount>
  tetris: Record<number, TetrisShape>
  tetrisBlue: Record<number, TetrisShape>
  solution: number[]
  symmetryKind: SymmetryKind
}

// ===== UTILITIES =====
const edgeKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`)

const vertexXY = (v: number, cols: number): Vertex => {
  const width = cols + 1
  return { x: v % width, y: Math.floor(v / width) }
}

const vertexAt = (x: number, y: number, cols: number): number => y * (cols + 1) + x

const neighbors = (v: number, cols: number, rows: number): number[] => {
  const { x, y } = vertexXY(v, cols)
  const result: number[] = []
  if (x > 0) result.push(vertexAt(x - 1, y, cols))
  if (x < cols) result.push(vertexAt(x + 1, y, cols))
  if (y > 0) result.push(vertexAt(x, y - 1, cols))
  if (y < rows) result.push(vertexAt(x, y + 1, cols))
  return result
}

const isBorder = (v: number, cols: number, rows: number): boolean => {
  const { x, y } = vertexXY(v, cols)
  return x === 0 || y === 0 || x === cols || y === rows
}

const mirrorVertex = (v: number, cols: number, rows: number, kind: SymmetryKind): number => {
  const { x, y } = vertexXY(v, cols)
  return kind === 'rotational' ? vertexAt(cols - x, rows - y, cols) : vertexAt(cols - x, y, cols)
}

const mirrorEdgeKey = (edge: string, cols: number, rows: number, kind: SymmetryKind): string => {
  const [a, b] = edge.split('-').map(Number)
  return edgeKey(mirrorVertex(a, cols, rows, kind), mirrorVertex(b, cols, rows, kind))
}

// ===== EXPORT =====
export { edgeKey, vertexXY, vertexAt, neighbors, isBorder, mirrorVertex, mirrorEdgeKey }
