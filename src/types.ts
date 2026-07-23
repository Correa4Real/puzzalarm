// internal — absolute paths
import type { PuzzleType, Difficulty } from '@/puzzle/types'

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
  puzzleType: PuzzleType | 'random'
  difficulty: Difficulty
  vibrate: boolean
  volumeRamp: boolean
  soundId: SoundId
  ringtoneUri?: string
  ringtoneName?: string
  solvedMessage?: string
  snoozeMinutes: number
  oneShotAt?: number
}

export interface Settings {
  language: 'pt' | 'en'
  snoozeMinutes: number
  rampSeconds: number
  maxVolume: number
}

export type Screen =
  | { name: 'home' }
  | { name: 'edit'; alarmId?: string }
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
  puzzleType: 'maze',
  difficulty: 'easy',
  vibrate: true,
  volumeRamp: true,
  soundId: 'panel',
  snoozeMinutes: DefaultAlarmValues.snoozeMinutes,
})

// ===== EXPORT =====
export { defaultSettings, newAlarm }
