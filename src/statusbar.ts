// external libs
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

// ===== TYPES =====
export type ScreenColor = 'amber' | 'green' | 'blue' | 'rose' | 'teal'

// ===== CONFIGURATIONS =====
const BarColors: Record<ScreenColor, { hex: string; style: Style }> = {
  amber: { hex: '#ffc133', style: Style.Light },
  green: { hex: '#52e46c', style: Style.Light },
  blue: { hex: '#6d75ee', style: Style.Dark },
  rose: { hex: '#f0708c', style: Style.Dark },
  teal: { hex: '#3fd4de', style: Style.Light },
}

// ===== SERVICE =====
const setScreenBarColor = async (color: ScreenColor): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setBackgroundColor({ color: BarColors[color].hex })
    await StatusBar.setStyle({ style: BarColors[color].style })
  } catch {
    return
  }
}

// ===== EXPORT =====
export { setScreenBarColor }
