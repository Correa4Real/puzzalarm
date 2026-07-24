// external libs
import { useEffect, useMemo, useRef, useState } from 'react'

// internal — absolute paths
import type { Puzzle } from '@/puzzle/types'
import { edgeKey, vertexXY, vertexAt, neighbors, mirrorVertex, mirrorEdgeKey } from '@/puzzle/types'
import { validatePath, findViolations, Violations } from '@/puzzle/validate'
import { alarmSound } from '@/audio/alarmSound'
import { tapHaptic } from '@/alarm/scheduler'

// ===== CONFIGURATIONS =====
interface PanelTheme {
  bg: string
  grid: string
  line: string
  lineGlow: string
  dot: string
  mirrorLine?: string
}

const panelThemes: Record<Puzzle['type'], PanelTheme> = {
  maze: { bg: '#efa900', grid: '#6d4d00', line: '#ffe98a', lineGlow: '#fff3bd', dot: '#3d2b00' },
  dots: { bg: '#2fca4b', grid: '#116b26', line: '#c9ffd2', lineGlow: '#eafff0', dot: '#08321a' },
  squares: { bg: '#5058dd', grid: '#272c8f', line: '#cfd4ff', lineGlow: '#eef0ff', dot: '#14174d' },
  colors: { bg: '#d84f6e', grid: '#571523', line: '#ffd7de', lineGlow: '#fff0f3', dot: '#3d0d16' },
  symmetry: { bg: '#17b5c0', grid: '#06484f', line: '#ffef9a', lineGlow: '#fffbe0', dot: '#032f34', mirrorLine: '#bff7ff' },
  symhex: { bg: '#0f9bb0', grid: '#043842', line: '#ffe36e', lineGlow: '#fff6cf', dot: '#ffd75e', mirrorLine: '#7fe3ff' },
  triangles: { bg: '#c86b2b', grid: '#4a1f08', line: '#ffe1c8', lineGlow: '#fff3ea', dot: '#2e1204' },
  tetris: { bg: '#b8a12f', grid: '#3d3406', line: '#fff2b3', lineGlow: '#fffbe5', dot: '#1c1802' },
  subtract: { bg: '#4a7ec9', grid: '#0b2952', line: '#d8e4ff', lineGlow: '#f0f5ff', dot: '#04122e' },
}

const SYMHEX_MAIN_DOT = '#ffd75e'
const SYMHEX_MIRROR_DOT = '#7fe3ff'

const SquarePalettes: Record<string, string[]> = {
  squares: ['#101014', '#fafaf2'],
  colors: ['#fafaf2', '#ffb01f', '#7b2fd0', '#17c964'],
}
const TETRIS_FILL = '#f4c73a'
const TETRIS_STROKE = '#3d3406'
const TETRIS_BLUE_FILL = '#4ac0ff'
const TETRIS_BLUE_STROKE = '#0b3d63'
const TRIANGLE_FILL = '#ffb454'

const PANEL_MARGIN = 0.72
const STROKE = 0.2
const START_RADIUS = 0.3
const TIP_RADIUS = 0.15
const NUB_LENGTH = 0.34
const EXIT_LIGHT_RADIUS = 0.09
const START_TOUCH_RADIUS = 0.55
const COMMIT_THRESHOLD = 0.75
const RETRACT_THRESHOLD = 0.5
const MAX_STEPS_PER_MOVE = 6
const FAIL_CLEAR_MS = 650
const VIOLATION_CLEAR_MS = 1500
const FAIL_LINE_COLOR = '#1a1a1a'
const SQUARE_SIZE = 0.38
const SQUARE_RADIUS = 0.11
const DOT_RADIUS = 0.11
const TRIANGLE_SIZE = 0.16
const TRIANGLE_GAP = 0.05
const TETRIS_CELL = 0.11
const TETRIS_GAP = 0.02

interface Props {
  puzzle: Puzzle
  onSolved: () => void
  onFail?: () => void
  resetSignal?: number
  disabled?: boolean
}

interface Point {
  x: number
  y: number
}

type Status = 'idle' | 'drawing' | 'fail' | 'solved'

// ===== UTILITIES =====
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const hexagonPoints = (cx: number, cy: number, radius: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i + Math.PI / 6
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
  }).join(' ')

const trianglePoints = (cx: number, cy: number, size: number): string => {
  const h = size * Math.sqrt(3) / 2
  return `${cx},${cy - h * 0.55} ${cx - size / 2},${cy + h * 0.45} ${cx + size / 2},${cy + h * 0.45}`
}

const pathD = (points: Point[]): string =>
  points.length > 0 ? 'M ' + points.map(p => `${p.x} ${p.y}`).join(' L ') : ''

// ===== MAIN COMPONENT =====
const PuzzlePanel = ({ puzzle, onSolved, onFail, resetSignal = 0, disabled }: Props) => {
  const [path, setPath] = useState<number[]>([])
  const [tip, setTip] = useState<Point | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [violations, setViolations] = useState<Violations | null>(null)
  const [origin, setOrigin] = useState<'main' | 'mirror'>('main')
  const originRef = useRef(origin)
  originRef.current = origin
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef(path)
  pathRef.current = path
  const statusRef = useRef(status)
  statusRef.current = status

  const theme = panelThemes[puzzle.type]
  const isSymmetry = puzzle.type === 'symmetry' || puzzle.type === 'symhex'
  const width = puzzle.cols + 2 * PANEL_MARGIN
  const height = puzzle.rows + 2 * PANEL_MARGIN

  const toPoint = (v: number): Point => {
    const { x, y } = vertexXY(v, puzzle.cols)
    return { x: PANEL_MARGIN + x, y: PANEL_MARGIN + y }
  }

  const mirrorV = (v: number): number => mirrorVertex(v, puzzle.cols, puzzle.rows, puzzle.symmetryKind)

  const mirrorPoint = (p: Point): Point =>
    puzzle.symmetryKind === 'rotational' ? { x: width - p.x, y: height - p.y } : { x: width - p.x, y: p.y }

  useEffect(() => {
    setPath([])
    setTip(null)
    setStatus('idle')
    setViolations(null)
    setOrigin('main')
  }, [puzzle, resetSignal])

  const broken = useMemo(() => new Set(puzzle.brokenEdges), [puzzle])

  const allEnds = useMemo(() => {
    if (!isSymmetry) return puzzle.ends
    return [...puzzle.ends, ...puzzle.ends.map(end => mirrorVertex(end, puzzle.cols, puzzle.rows, puzzle.symmetryKind))]
  }, [puzzle, isSymmetry])

  const gridEdges = useMemo(() => {
    const result: Array<{ a: Point; b: Point }> = []
    for (let y = 0; y <= puzzle.rows; y++) {
      for (let x = 0; x <= puzzle.cols; x++) {
        const v = vertexAt(x, y, puzzle.cols)
        if (x < puzzle.cols) {
          const u = vertexAt(x + 1, y, puzzle.cols)
          if (!broken.has(edgeKey(v, u))) result.push({ a: toPoint(v), b: toPoint(u) })
        }
        if (y < puzzle.rows) {
          const u = vertexAt(x, y + 1, puzzle.cols)
          if (!broken.has(edgeKey(v, u))) result.push({ a: toPoint(v), b: toPoint(u) })
        }
      }
    }
    return result
  }, [puzzle, broken])

  const jointVertices = useMemo(() => {
    const result: Point[] = []
    for (let y = 0; y <= puzzle.rows; y++) {
      for (let x = 0; x <= puzzle.cols; x++) {
        const v = vertexAt(x, y, puzzle.cols)
        const hasEdge = neighbors(v, puzzle.cols, puzzle.rows).some(n => !broken.has(edgeKey(v, n)))
        if (hasEdge) result.push(toPoint(v))
      }
    }
    return result
  }, [puzzle, broken])

  const nubFor = (end: number) => {
    const { x, y } = vertexXY(end, puzzle.cols)
    const point = toPoint(end)
    let dx = 0
    let dy = 0
    if (y === 0) dy = -1
    else if (y === puzzle.rows) dy = 1
    else if (x === puzzle.cols) dx = 1
    else if (x === 0) dx = -1
    else dy = -1
    return { from: point, to: { x: point.x + dx * NUB_LENGTH, y: point.y + dy * NUB_LENGTH } }
  }

  const svgPoint = (e: React.PointerEvent): Point => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const projected = pt.matrixTransform(matrix.inverse())
    return { x: projected.x, y: projected.y }
  }

  const startPos = toPoint(puzzle.start)

  const isBlockedForPlayer = (head: number, next: number, currentPath: number[]): boolean => {
    if (broken.has(edgeKey(head, next))) return true
    if (!isSymmetry) return false
    const mirroredNext = mirrorV(next)
    if (mirroredNext === next) return true
    if (currentPath.includes(mirroredNext)) return true
    if (broken.has(mirrorEdgeKey(edgeKey(head, next), puzzle.cols, puzzle.rows, puzzle.symmetryKind))) return true
    return false
  }

  const handleDown = (e: React.PointerEvent) => {
    if (disabled || statusRef.current === 'solved') return
    const pointer = svgPoint(e)
    const near = (p: Point) => Math.hypot(pointer.x - p.x, pointer.y - p.y) < START_TOUCH_RADIUS

    const begin = (from: 'main' | 'mirror', vertex: number, pos: Point) => {
      setOrigin(from)
      originRef.current = from
      setPath([vertex])
      pathRef.current = [vertex]
      setTip(pos)
      setStatus('drawing')
      tapHaptic()
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    }

    if (near(startPos)) {
      begin('main', puzzle.start, startPos)
    } else if (isSymmetry && near(mirrorPoint(startPos))) {
      begin('mirror', mirrorV(puzzle.start), mirrorPoint(startPos))
    }
  }

  const handleMove = (e: React.PointerEvent) => {
    if (statusRef.current !== 'drawing') return
    const pointer = svgPoint(e)

    for (let step = 0; step < MAX_STEPS_PER_MOVE; step++) {
      const current = pathRef.current
      const head = current[current.length - 1]
      const previous = current[current.length - 2]
      const headPos = toPoint(head)

      let best: { vertex: number; t: number; dist: number; point: Point } | null = null
      for (const neighbor of neighbors(head, puzzle.cols, puzzle.rows)) {
        const isRetract = neighbor === previous
        if (!isRetract && current.includes(neighbor)) continue
        if (!isRetract && isBlockedForPlayer(head, neighbor, current)) continue
        if (isRetract && broken.has(edgeKey(head, neighbor))) continue
        const neighborPos = toPoint(neighbor)
        const dx = neighborPos.x - headPos.x
        const dy = neighborPos.y - headPos.y
        const t = clamp(((pointer.x - headPos.x) * dx + (pointer.y - headPos.y) * dy) / (dx * dx + dy * dy), 0, 1)
        const projected = { x: headPos.x + dx * t, y: headPos.y + dy * t }
        const dist = Math.hypot(pointer.x - projected.x, pointer.y - projected.y)
        if (!best || dist < best.dist) best = { vertex: neighbor, t, dist, point: projected }
      }

      let nubOption: { t: number; dist: number; point: Point } | null = null
      if (allEnds.includes(head)) {
        const nub = nubFor(head)
        const dx = nub.to.x - nub.from.x
        const dy = nub.to.y - nub.from.y
        const t = clamp(((pointer.x - nub.from.x) * dx + (pointer.y - nub.from.y) * dy) / (dx * dx + dy * dy), 0, 1)
        const projected = { x: nub.from.x + dx * t, y: nub.from.y + dy * t }
        const dist = Math.hypot(pointer.x - projected.x, pointer.y - projected.y)
        nubOption = { t, dist, point: projected }
      }

      if (nubOption && (!best || nubOption.dist <= best.dist)) {
        setTip(nubOption.point)
        break
      }

      if (!best) {
        setTip(headPos)
        break
      }

      if (best.vertex === previous) {
        if (best.t > RETRACT_THRESHOLD) {
          const retracted = pathRef.current.slice(0, -1)
          setPath(retracted)
          pathRef.current = retracted
          continue
        }
        setTip(best.point)
        break
      }

      if (best.t > COMMIT_THRESHOLD) {
        const extended = [...pathRef.current, best.vertex]
        setPath(extended)
        pathRef.current = extended
        continue
      }

      setTip(best.point)
      break
    }
  }

  const finish = () => {
    if (statusRef.current !== 'drawing') return
    const current = pathRef.current
    if (current.length < 2) {
      setPath([])
      setTip(null)
      setStatus('idle')
      return
    }
    const head = current[current.length - 1]
    const reachedEnd = allEnds.includes(head)
    const effectivePath = originRef.current === 'mirror' ? current.map(mirrorV) : current
    if (reachedEnd && validatePath({ ...puzzle, ends: allEnds }, effectivePath)) {
      setTip(toPoint(head))
      setStatus('solved')
      onSolved()
      return
    }
    let clearDelay = FAIL_CLEAR_MS
    if (reachedEnd) {
      const found = findViolations(puzzle, effectivePath)
      if (found.dots.length || found.mirrorDots.length || found.squareCells.length) {
        setViolations(found)
        clearDelay = VIOLATION_CLEAR_MS
      }
    }
    setStatus('fail')
    alarmSound.playError()
    onFail?.()
    window.setTimeout(() => {
      setPath([])
      setTip(null)
      setStatus('idle')
      setViolations(null)
    }, clearDelay)
  }

  const pathPoints = path.map(toPoint)
  const linePoints = tip && status === 'drawing' ? [...pathPoints, tip] : pathPoints
  const solvedHead = status === 'solved' ? nubFor(path[path.length - 1]) : null
  const originStartPos = origin === 'mirror' ? mirrorPoint(startPos) : startPos
  const playerBaseColor = origin === 'mirror' ? theme.mirrorLine ?? theme.line : theme.line
  const autoBaseColor = origin === 'mirror' ? theme.line : theme.mirrorLine ?? theme.line
  const lineColor = status === 'fail' ? FAIL_LINE_COLOR : status === 'solved' ? theme.lineGlow : playerBaseColor
  const mirrorColor = status === 'fail' ? FAIL_LINE_COLOR : autoBaseColor
  const mirrorPoints = isSymmetry ? linePoints.map(mirrorPoint) : []
  const mirrorTip = isSymmetry && tip ? mirrorPoint(tip) : null
  const squarePalette = SquarePalettes[puzzle.type] ?? SquarePalettes.squares

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={`puzzle-panel status-${status}`}
      style={{ touchAction: 'none', display: 'block', width: '100%' }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <rect x={0} y={0} width={width} height={height} rx={0.3} fill={theme.bg} />

      <g stroke={theme.grid} strokeWidth={STROKE} strokeLinecap="butt">
        {gridEdges.map((edge, i) => (
          <line key={i} x1={edge.a.x} y1={edge.a.y} x2={edge.b.x} y2={edge.b.y} />
        ))}
      </g>
      <g fill={theme.grid}>
        {jointVertices.map((point, i) => (
          <rect key={i} x={point.x - STROKE / 2} y={point.y - STROKE / 2} width={STROKE} height={STROKE} />
        ))}
      </g>
      <g stroke={theme.grid} strokeWidth={STROKE} strokeLinecap="round">
        {allEnds.map(end => {
          const nub = nubFor(end)
          const isEscape = puzzle.ends.length > 1 && end === puzzle.ends[puzzle.ends.length - 1]
          return (
            <line
              key={`nub-${end}`}
              x1={nub.from.x}
              y1={nub.from.y}
              x2={nub.to.x}
              y2={nub.to.y}
              className={isEscape ? 'escape-nub' : ''}
            />
          )
        })}
      </g>
      {status !== 'solved' &&
        allEnds.map(end => {
          const nub = nubFor(end)
          return (
            <g key={`light-${end}`}>
              <circle className="exit-drop" cx={nub.to.x} cy={nub.to.y} r={EXIT_LIGHT_RADIUS * 0.6} fill="#ffffff" />
              <circle className="exit-ripple" cx={nub.to.x} cy={nub.to.y} fill="none" stroke="#ffffff" strokeWidth={0.028} />
              <circle className="exit-ripple exit-ripple--late" cx={nub.to.x} cy={nub.to.y} fill="none" stroke="#ffffff" strokeWidth={0.028} />
            </g>
          )
        })}
      <circle cx={startPos.x} cy={startPos.y} r={START_RADIUS} fill={theme.grid} />
      {isSymmetry && (
        <circle cx={mirrorPoint(startPos).x} cy={mirrorPoint(startPos).y} r={START_RADIUS} fill={theme.grid} />
      )}

      {Object.entries(puzzle.squares).map(([cell, color]) => {
        const index = Number(cell)
        const cx = PANEL_MARGIN + (index % puzzle.cols) + 0.5
        const cy = PANEL_MARGIN + Math.floor(index / puzzle.cols) + 0.5
        return (
          <rect
            key={cell}
            className={violations?.squareCells.includes(index) ? 'violation' : ''}
            x={cx - SQUARE_SIZE / 2}
            y={cy - SQUARE_SIZE / 2}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            rx={SQUARE_RADIUS}
            fill={squarePalette[color % squarePalette.length]}
          />
        )
      })}

      {Object.entries(puzzle.triangles).map(([cell, count]) => {
        const index = Number(cell)
        const cx = PANEL_MARGIN + (index % puzzle.cols) + 0.5
        const cy = PANEL_MARGIN + Math.floor(index / puzzle.cols) + 0.5
        const totalWidth = count * TRIANGLE_SIZE + (count - 1) * TRIANGLE_GAP
        const startX = cx - totalWidth / 2 + TRIANGLE_SIZE / 2
        const isViolation = violations?.triangleCells?.includes(index)
        return (
          <g key={`tri-${cell}`} className={isViolation ? 'violation' : ''}>
            {Array.from({ length: count }, (_, i) => (
              <polygon
                key={i}
                points={trianglePoints(startX + i * (TRIANGLE_SIZE + TRIANGLE_GAP), cy, TRIANGLE_SIZE)}
                fill={TRIANGLE_FILL}
                stroke={theme.grid}
                strokeWidth={0.018}
              />
            ))}
          </g>
        )
      })}

      {Object.entries(puzzle.tetris).map(([cell, shape]) => {
        const index = Number(cell)
        const cx = PANEL_MARGIN + (index % puzzle.cols) + 0.5
        const cy = PANEL_MARGIN + Math.floor(index / puzzle.cols) + 0.5
        const xs = shape.cells.map(([dx]) => dx)
        const ys = shape.cells.map(([, dy]) => dy)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const step = TETRIS_CELL + TETRIS_GAP
        const totalW = (maxX - minX + 1) * step - TETRIS_GAP
        const totalH = (maxY - minY + 1) * step - TETRIS_GAP
        const originX = cx - totalW / 2
        const originY = cy - totalH / 2
        const isViolation = violations?.tetrisCells?.includes(index)
        return (
          <g key={`tet-${cell}`} className={isViolation ? 'violation' : ''}>
            {shape.cells.map(([dx, dy], i) => (
              <rect
                key={i}
                x={originX + (dx - minX) * step}
                y={originY + (dy - minY) * step}
                width={TETRIS_CELL}
                height={TETRIS_CELL}
                fill={TETRIS_FILL}
                stroke={TETRIS_STROKE}
                strokeWidth={0.015}
              />
            ))}
          </g>
        )
      })}

      {Object.entries(puzzle.tetrisBlue).map(([cell, shape]) => {
        const index = Number(cell)
        const cx = PANEL_MARGIN + (index % puzzle.cols) + 0.5
        const cy = PANEL_MARGIN + Math.floor(index / puzzle.cols) + 0.5
        const xs = shape.cells.map(([dx]) => dx)
        const ys = shape.cells.map(([, dy]) => dy)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        const step = TETRIS_CELL + TETRIS_GAP
        const totalW = (maxX - minX + 1) * step - TETRIS_GAP
        const totalH = (maxY - minY + 1) * step - TETRIS_GAP
        const originX = cx - totalW / 2
        const originY = cy - totalH / 2
        const isViolation = violations?.tetrisCells?.includes(index)
        return (
          <g key={`tetB-${cell}`} className={isViolation ? 'violation' : ''}>
            {shape.cells.map(([dx, dy], i) => (
              <rect
                key={i}
                x={originX + (dx - minX) * step}
                y={originY + (dy - minY) * step}
                width={TETRIS_CELL}
                height={TETRIS_CELL}
                fill="none"
                stroke={TETRIS_BLUE_STROKE}
                strokeWidth={0.025}
              />
            ))}
            {shape.cells.map(([dx, dy], i) => (
              <rect
                key={`f-${i}`}
                x={originX + (dx - minX) * step + TETRIS_CELL * 0.25}
                y={originY + (dy - minY) * step + TETRIS_CELL * 0.25}
                width={TETRIS_CELL * 0.5}
                height={TETRIS_CELL * 0.5}
                fill={TETRIS_BLUE_FILL}
              />
            ))}
          </g>
        )
      })}

      {puzzle.dots.map(dot => {
        let cx: number
        let cy: number
        if (dot.startsWith('v:')) {
          const point = toPoint(Number(dot.slice(2)))
          cx = point.x
          cy = point.y
        } else {
          const [a, b] = dot.slice(2).split('-').map(Number)
          const pa = toPoint(a)
          const pb = toPoint(b)
          cx = (pa.x + pb.x) / 2
          cy = (pa.y + pb.y) / 2
        }
        const fill = puzzle.type === 'symhex' ? SYMHEX_MAIN_DOT : theme.dot
        return (
          <polygon
            key={dot}
            className={violations?.dots.includes(dot) ? 'violation' : ''}
            points={hexagonPoints(cx, cy, DOT_RADIUS)}
            fill={fill}
            stroke={puzzle.type === 'symhex' ? theme.grid : 'none'}
            strokeWidth={puzzle.type === 'symhex' ? 0.02 : 0}
          />
        )
      })}

      {puzzle.mirrorDots.map(dot => {
        const [a, b] = dot.slice(2).split('-').map(Number)
        const pa = toPoint(a)
        const pb = toPoint(b)
        const cx = (pa.x + pb.x) / 2
        const cy = (pa.y + pb.y) / 2
        return (
          <polygon
            key={`m-${dot}`}
            className={violations?.mirrorDots.includes(dot) ? 'violation' : ''}
            points={hexagonPoints(cx, cy, DOT_RADIUS)}
            fill={SYMHEX_MIRROR_DOT}
            stroke={theme.grid}
            strokeWidth={0.02}
          />
        )
      })}

      {path.length > 0 && (
        <g className="player-line">
          {isSymmetry && mirrorPoints.length > 1 && (
            <path
              d={pathD(mirrorPoints)}
              stroke={mirrorColor}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeLinejoin="round"
              fill="none"
            />
          )}
          {isSymmetry && (
            <circle cx={mirrorPoint(originStartPos).x} cy={mirrorPoint(originStartPos).y} r={START_RADIUS} fill={mirrorColor} />
          )}
          {isSymmetry && mirrorTip && status !== 'solved' && (
            <circle cx={mirrorTip.x} cy={mirrorTip.y} r={TIP_RADIUS} fill={mirrorColor} />
          )}
          <circle cx={originStartPos.x} cy={originStartPos.y} r={START_RADIUS} fill={lineColor} />
          {linePoints.length > 1 && (
            <path
              d={pathD(linePoints)}
              stroke={lineColor}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeLinejoin="round"
              fill="none"
            />
          )}
          {tip && status === 'drawing' && <circle cx={tip.x} cy={tip.y} r={TIP_RADIUS} fill={lineColor} />}
          {solvedHead && (
            <>
              <line
                x1={solvedHead.from.x}
                y1={solvedHead.from.y}
                x2={solvedHead.to.x}
                y2={solvedHead.to.y}
                stroke={lineColor}
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
              {isSymmetry && (
                <line
                  x1={mirrorPoint(solvedHead.from).x}
                  y1={mirrorPoint(solvedHead.from).y}
                  x2={mirrorPoint(solvedHead.to).x}
                  y2={mirrorPoint(solvedHead.to).y}
                  stroke={mirrorColor}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                />
              )}
            </>
          )}
        </g>
      )}
    </svg>
  )
}

// ===== EXPORT =====
export type { PanelTheme }
export { panelThemes }
export default PuzzlePanel
