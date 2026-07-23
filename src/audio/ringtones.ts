// external libs
import { Capacitor, registerPlugin } from '@capacitor/core'

// ===== TYPES =====
export interface Ringtone {
  title: string
  uri: string
}

interface RingtonesPlugin {
  list(): Promise<{ ringtones: Ringtone[] }>
  play(options: { uri: string; volume?: number }): Promise<void>
  setVolume(options: { volume: number }): Promise<void>
  stop(): Promise<void>
}

// ===== CONFIGURATIONS =====
const plugin = registerPlugin<RingtonesPlugin>('Ringtones')

// ===== SERVICE =====
const ringtonesAvailable = (): boolean => Capacitor.isNativePlatform()

const listRingtones = async (): Promise<Ringtone[]> => {
  if (!ringtonesAvailable()) return []
  try {
    const { ringtones } = await plugin.list()
    return ringtones
  } catch {
    return []
  }
}

const playRingtone = async (uri: string, volume: number): Promise<void> => {
  if (!ringtonesAvailable()) return
  try {
    await plugin.play({ uri, volume })
  } catch {
    return
  }
}

const setRingtoneVolume = async (volume: number): Promise<void> => {
  if (!ringtonesAvailable()) return
  try {
    await plugin.setVolume({ volume })
  } catch {
    return
  }
}

const stopRingtone = async (): Promise<void> => {
  if (!ringtonesAvailable()) return
  try {
    await plugin.stop()
  } catch {
    return
  }
}

// ===== EXPORT =====
export { ringtonesAvailable, listRingtones, playRingtone, setRingtoneVolume, stopRingtone }
