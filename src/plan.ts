// internal — absolute paths
import type { PuzzleType, Difficulty } from '@/puzzle/types'
import type { Alarm } from '@/types'

// ===== CONFIGURATIONS =====
export type Plan = 'free' | 'pro'

const FREE_ALARM_LIMIT = 2
const FREE_PUZZLE_TYPES: PuzzleType[] = ['maze', 'dots', 'squares']
const FREE_DIFFICULTIES: Difficulty[] = ['easy']
const PRO_PRICE_BRL = 6

const PRO_PUZZLE_TYPES: PuzzleType[] = [
  'colors',
  'symmetry',
  'symhex',
  'triangles',
  'tetris',
  'subtract',
]

const PRO_DIFFICULTIES: Difficulty[] = ['medium', 'hard', 'expert']

// ===== UTILITIES =====
const isPro = (plan: Plan): boolean => plan === 'pro'

const foldersLocked = (plan: Plan, folderCount: number): boolean => !isPro(plan) && folderCount > 0

const isPuzzleTypeFree = (type: PuzzleType): boolean => FREE_PUZZLE_TYPES.includes(type)

const isDifficultyFree = (difficulty: Difficulty): boolean => FREE_DIFFICULTIES.includes(difficulty)

const countLooseAlarms = (alarms: Alarm[]): number => alarms.filter(alarm => !alarm.folderId).length

const canCreateAlarm = (plan: Plan, alarms: Alarm[]): boolean => {
  if (isPro(plan)) return true
  return countLooseAlarms(alarms) < FREE_ALARM_LIMIT
}

const canCreateFolder = (plan: Plan): boolean => isPro(plan)

const clampAlarmForPlan = (alarm: Alarm, plan: Plan): Alarm => {
  if (isPro(plan)) return alarm
  const puzzleTypes = alarm.puzzleTypes.filter(isPuzzleTypeFree)
  return {
    ...alarm,
    puzzleTypes: puzzleTypes.length > 0 ? puzzleTypes : ['maze'],
    difficulty: 'easy',
  }
}

// ===== EXPORT =====
export {
  FREE_ALARM_LIMIT,
  FREE_PUZZLE_TYPES,
  FREE_DIFFICULTIES,
  PRO_PRICE_BRL,
  PRO_PUZZLE_TYPES,
  PRO_DIFFICULTIES,
  isPro,
  foldersLocked,
  isPuzzleTypeFree,
  isDifficultyFree,
  countLooseAlarms,
  canCreateAlarm,
  canCreateFolder,
  clampAlarmForPlan,
}
