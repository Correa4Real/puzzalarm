// internal — absolute paths
import type { PuzzleType, Difficulty } from '@/puzzle/types'
import type { Plan } from '@/plan'

// ===== CONFIGURATIONS =====
const ALL_PUZZLE_TYPES: PuzzleType[] = ['maze', 'dots', 'squares', 'colors', 'symmetry', 'symhex', 'triangles', 'tetris', 'subtract']
const MAX_PUZZLE_COUNT = 5

// ===== TYPES =====
export type SoundId = 'panel' | 'bells' | 'pulse' | 'choir' | 'custom' | 'ringtone'

export interface CustomSound {
  name: string
  dataUrl: string
}

export interface Alarm {
  id: string
  hour: number
  minute: number
  days: number[]
  enabled: boolean
  label: string
  puzzleTypes: PuzzleType[]
  puzzleCount: number
  difficulty: Difficulty
  vibrate: boolean
  volumeRamp: boolean
  soundId: SoundId
  ringtoneUri?: string
  ringtoneName?: string
  solvedMessage?: string
  snoozeMinutes: number
  oneShotAt?: number
  folderId?: string
}

export interface Folder {
  id: string
  name: string
}

export interface Settings {
  language: 'pt' | 'en'
  snoozeMinutes: number
  rampSeconds: number
  maxVolume: number
  plan: Plan
}

export type Screen =
  | { name: 'home' }
  | { name: 'edit'; alarmId?: string; folderId?: string }
  | { name: 'folder'; folderId: string }
  | { name: 'settings' }
  | { name: 'tutorial'; from: 'settings' | 'home' }
  | { name: 'test' }
  | { name: 'ringing'; alarmId: string }

// ===== CONFIGURATIONS =====
const defaultSettings: Settings = {
  language: 'pt',
  snoozeMinutes: 5,
  rampSeconds: 45,
  maxVolume: 1,
  plan: 'free',
}

const DefaultAlarmValues = {
  hour: 7,
  minute: 0,
  days: [1, 2, 3, 4, 5],
  snoozeMinutes: 5,
}

// ===== UTILITIES =====
const newAlarm = (): Alarm => ({
  id: Math.random().toString(36).slice(2, 10),
  hour: DefaultAlarmValues.hour,
  minute: DefaultAlarmValues.minute,
  days: [...DefaultAlarmValues.days],
  enabled: true,
  label: '',
  puzzleTypes: ['maze'],
  puzzleCount: 1,
  difficulty: 'easy',
  vibrate: true,
  volumeRamp: true,
  soundId: 'panel',
  snoozeMinutes: DefaultAlarmValues.snoozeMinutes,
})

const newFolder = (name: string): Folder => ({
  id: Math.random().toString(36).slice(2, 10),
  name,
})

const normalizeAlarm = (raw: Alarm & { puzzleType?: PuzzleType | 'random' }): Alarm => {
  const puzzleTypes =
    Array.isArray(raw.puzzleTypes) && raw.puzzleTypes.length > 0
      ? raw.puzzleTypes
      : raw.puzzleType === 'random'
        ? [...ALL_PUZZLE_TYPES]
        : raw.puzzleType
          ? [raw.puzzleType]
          : ['maze' as PuzzleType]
  const puzzleCount =
    typeof raw.puzzleCount === 'number' ? Math.min(MAX_PUZZLE_COUNT, Math.max(1, Math.round(raw.puzzleCount))) : 1
  return { ...raw, puzzleTypes, puzzleCount }
}

// ===== EXPORT =====
export { defaultSettings, newAlarm, newFolder, normalizeAlarm, ALL_PUZZLE_TYPES, MAX_PUZZLE_COUNT }
