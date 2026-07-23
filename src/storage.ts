// external libs
import { Preferences } from '@capacitor/preferences'

// ===== SERVICE =====
const loadJSON = async <T,>(key: string): Promise<T | null> => {
  try {
    const { value } = await Preferences.get({ key })
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

const saveJSON = async (key: string, value: unknown): Promise<void> => {
  try {
    await Preferences.set({ key, value: JSON.stringify(value) })
  } catch {
    return
  }
}

// ===== EXPORT =====
export { loadJSON, saveJSON }
