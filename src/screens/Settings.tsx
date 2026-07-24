// external libs
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'

// internal — absolute paths
import { useStore } from '@/store'
import { PressButton, Segmented, ScreenShell } from '@/components/ui'
import { nativeAlarmsAvailable, openFullScreenIntentSettings } from '@/alarm/nativeAlarms'
import { isPro, PRO_PRICE_BRL } from '@/plan'
import Paywall from '@/components/Paywall'

// ===== CONFIGURATIONS =====
const SNOOZE_MIN = 1
const SNOOZE_MAX = 20
const RAMP_MIN = 5
const RAMP_MAX = 120
const RAMP_STEP = 5

// ===== MAIN COMPONENT =====
const Settings = () => {
  const { settings, t, setScreen, setSettings, downgradeToFree } = useStore()
  const [showPaywall, setShowPaywall] = useState(false)
  const pro = isPro(settings.plan)

  return (
    <ScreenShell color="blue">
      <div className="row" style={{ marginBottom: 10 }}>
        <PressButton variant="ghost" onClick={() => setScreen({ name: 'home' })} style={{ padding: '10px 14px' }}>
          {'←'}
        </PressButton>
        <span className="screen-title" style={{ color: '#fff' }}>{t.settings}</span>
        <span style={{ width: 48 }} />
      </div>

      <div className="stack" style={{ paddingBottom: 30 }}>
        <div className="card card--dark stack">
          <span className="label-sm">{t.managePlan}</span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {pro ? t.planPro : t.planFree}
          </div>
          {!pro && (
            <PressButton variant="dark" onClick={() => setShowPaywall(true)} style={{ fontSize: 15 }}>
              {t.paywallSubscribe} · R$ {PRO_PRICE_BRL}{t.paywallPerMonth}
            </PressButton>
          )}
          {pro && (
            <PressButton variant="ghost" onClick={downgradeToFree} style={{ fontSize: 14 }}>
              {t.cancelPro}
            </PressButton>
          )}
        </div>

        <div className="card card--dark stack">
          <span className="label-sm">{t.language}</span>
          <Segmented
            value={settings.language}
            onChange={language => setSettings({ language })}
            options={[
              { value: 'pt', label: 'Português' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>

        <div className="card card--dark stack">
          <span className="label-sm">
            {t.snoozeMinutes}: {settings.snoozeMinutes} {t.minutes}
          </span>
          <input
            className="range-input"
            type="range"
            min={SNOOZE_MIN}
            max={SNOOZE_MAX}
            value={settings.snoozeMinutes}
            onChange={e => setSettings({ snoozeMinutes: Number(e.target.value) })}
          />
          <span className="label-sm">
            {t.rampSeconds}: {settings.rampSeconds} {t.seconds}
          </span>
          <input
            className="range-input"
            type="range"
            min={RAMP_MIN}
            max={RAMP_MAX}
            step={RAMP_STEP}
            value={settings.rampSeconds}
            onChange={e => setSettings({ rampSeconds: Number(e.target.value) })}
          />
        </div>

        <PressButton variant="dark" onClick={() => setScreen({ name: 'tutorial', from: 'settings' })} style={{ fontSize: 16 }}>
          {t.tutorial}
        </PressButton>
        <PressButton variant="dark" onClick={() => setScreen({ name: 'test' })} style={{ fontSize: 16 }}>
          {t.testPuzzles}
        </PressButton>
        {nativeAlarmsAvailable() && (
          <>
            <PressButton variant="dark" onClick={() => openFullScreenIntentSettings()} style={{ fontSize: 16 }}>
              {t.fullScreenPermission}
            </PressButton>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600 }}>
              {t.fullScreenPermissionHint}
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
          {t.alarmPermission}
        </div>
      </div>

      <AnimatePresence>
        {showPaywall && <Paywall reason="generic" onClose={() => setShowPaywall(false)} />}
      </AnimatePresence>
    </ScreenShell>
  )
}

// ===== EXPORT =====
export default Settings
