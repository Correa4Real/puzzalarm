// internal — absolute paths
import { useStore } from '@/store'
import { PressButton, Segmented, ScreenShell } from '@/components/ui'
import { nativeAlarmsAvailable, openFullScreenIntentSettings } from '@/alarm/nativeAlarms'

// ===== CONFIGURATIONS =====
const SNOOZE_MIN = 1
const SNOOZE_MAX = 20
const RAMP_MIN = 5
const RAMP_MAX = 120
const RAMP_STEP = 5

// ===== MAIN COMPONENT =====
const Settings = () => {
  const { settings, t, setScreen, setSettings } = useStore()

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
    </ScreenShell>
  )
}

// ===== EXPORT =====
export default Settings
