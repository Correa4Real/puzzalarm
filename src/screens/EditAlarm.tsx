// external libs
import { useEffect, useRef, useState } from 'react'

// internal — absolute paths
import type { Alarm, SoundId, CustomSound } from '@/types'
import type { PuzzleType } from '@/puzzle/types'
import { newAlarm, MAX_PUZZLE_COUNT } from '@/types'
import { useStore } from '@/store'
import { loadJSON, saveJSON } from '@/storage'
import { PressButton, WToggle, Segmented, MultiSelect, TimeWheel, ScreenShell } from '@/components/ui'
import { alarmSound } from '@/audio/alarmSound'
import { ringtonesAvailable, listRingtones, Ringtone } from '@/audio/ringtones'
import { ensureNotificationPermission, tapHaptic } from '@/alarm/scheduler'
import { canUseFullScreenIntent, openFullScreenIntentSettings } from '@/alarm/nativeAlarms'

// ===== CONFIGURATIONS =====
const LABEL_MAX_LENGTH = 30
const CUSTOM_SOUND_KEY = 'customSound'

interface Props {
  alarmId?: string
}

// ===== MAIN COMPONENT =====
const EditAlarm = ({ alarmId }: Props) => {
  const { alarms, t, setScreen, upsertAlarm, deleteAlarm } = useStore()
  const existing = alarms.find(alarm => alarm.id === alarmId)
  const [draft, setDraft] = useState<Alarm>(existing ? { ...existing } : newAlarm())
  const [customSoundName, setCustomSoundName] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [ringtones, setRingtones] = useState<Ringtone[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadJSON<CustomSound>(CUSTOM_SOUND_KEY).then(stored => {
      if (stored?.name) setCustomSoundName(stored.name)
    })
  }, [])

  const patch = (changes: Partial<Alarm>) => setDraft(prev => ({ ...prev, ...changes }))

  useEffect(() => {
    if (draft.soundId === 'ringtone' && ringtones === null && ringtonesAvailable()) {
      listRingtones().then(setRingtones)
    }
  }, [draft.soundId, ringtones])

  const handleSoundFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      await saveJSON(CUSTOM_SOUND_KEY, { name: file.name, dataUrl })
      setCustomSoundName(file.name)
      alarmSound.preview('custom')
    }
    reader.readAsDataURL(file)
  }

  const toggleDay = (day: number) => {
    tapHaptic()
    patch({ days: draft.days.includes(day) ? draft.days.filter(d => d !== day) : [...draft.days, day].sort() })
  }

  const togglePuzzleType = (type: PuzzleType) => {
    if (draft.puzzleTypes.includes(type)) {
      if (draft.puzzleTypes.length === 1) return
      patch({ puzzleTypes: draft.puzzleTypes.filter(item => item !== type) })
    } else {
      patch({ puzzleTypes: [...draft.puzzleTypes, type] })
    }
  }

  const save = async () => {
    await ensureNotificationPermission()
    const fullScreenGranted = await canUseFullScreenIntent()
    if (!fullScreenGranted) await openFullScreenIntentSettings()
    upsertAlarm({ ...draft, oneShotAt: undefined, enabled: true })
    setScreen({ name: 'home' })
  }

  return (
    <ScreenShell color="green">
      <div className="row" style={{ marginBottom: 10 }}>
        <PressButton variant="ghost" onClick={() => setScreen({ name: 'home' })} style={{ padding: '10px 14px' }}>
          {'←'}
        </PressButton>
        <span className="screen-title">{existing ? t.editAlarm : t.newAlarm}</span>
        <span style={{ width: 48 }} />
      </div>

      <div className="stack" style={{ paddingBottom: 30 }}>
        <div className="card" style={{ padding: '6px 10px' }}>
          <div className="timewheel-wrap">
            <TimeWheel count={24} value={draft.hour} onChange={hour => patch({ hour })} />
            <span className="timewheel-colon">:</span>
            <TimeWheel count={60} value={draft.minute} onChange={minute => patch({ minute })} />
          </div>
        </div>

        <div className="card card--dark stack">
          <span className="label-sm">{t.repeat}</span>
          <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
            {t.daysShort.map((day, index) => (
              <button key={index} className={`day-chip ${draft.days.includes(index) ? 'on' : ''}`} onClick={() => toggleDay(index)}>
                {day}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, textAlign: 'center', fontWeight: 600 }}>
            {draft.days.length === 0 ? t.once : draft.days.length === 7 ? t.everyDay : ''}
          </div>
        </div>

        <div className="card card--dark stack">
          <span className="label-sm">{t.label}</span>
          <input
            className="text-input"
            value={draft.label}
            placeholder={t.labelPlaceholder}
            maxLength={LABEL_MAX_LENGTH}
            onChange={e => patch({ label: e.target.value })}
          />
          <span className="label-sm">{t.solvedMessageLabel}</span>
          <input
            className="text-input"
            value={draft.solvedMessage ?? ''}
            placeholder={t.solvedMessagePlaceholder}
            maxLength={60}
            onChange={e => patch({ solvedMessage: e.target.value })}
          />
        </div>

        <div className="card card--dark stack">
          <span className="label-sm">{t.puzzle}</span>
          <MultiSelect
            values={draft.puzzleTypes}
            onToggle={togglePuzzleType}
            options={[
              { value: 'maze', label: t.maze },
              { value: 'dots', label: t.dots },
              { value: 'squares', label: t.squares },
            ]}
          />
          <MultiSelect
            values={draft.puzzleTypes}
            onToggle={togglePuzzleType}
            options={[
              { value: 'colors', label: t.colors },
              { value: 'symmetry', label: t.symmetry },
              { value: 'symhex', label: t.symhex },
            ]}
          />
          <span className="label-sm" style={{ marginTop: 6 }}>{t.difficulty}</span>
          <Segmented
            value={draft.difficulty}
            onChange={difficulty => patch({ difficulty })}
            options={[
              { value: 'easy', label: t.easy },
              { value: 'medium', label: t.medium },
              { value: 'hard', label: t.hard },
            ]}
          />
          <span className="label-sm" style={{ marginTop: 6 }}>{t.puzzleCount}</span>
          <Segmented
            value={String(draft.puzzleCount)}
            onChange={value => patch({ puzzleCount: Number(value) })}
            options={Array.from({ length: MAX_PUZZLE_COUNT }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
          />
        </div>

        <div className="card card--dark stack">
          <span className="label-sm">{t.sound}</span>
          <Segmented
            value={draft.soundId}
            onChange={(soundId: SoundId) => {
              patch({ soundId })
              alarmSound.preview(soundId)
            }}
            options={[
              { value: 'panel', label: t.sound_panel },
              { value: 'bells', label: t.sound_bells },
              { value: 'pulse', label: t.sound_pulse },
              { value: 'choir', label: t.sound_choir },
            ]}
          />
          <Segmented
            value={draft.soundId}
            onChange={(soundId: SoundId) => {
              patch({ soundId })
              if (soundId === 'custom' && customSoundName) alarmSound.preview(soundId)
            }}
            options={
              ringtonesAvailable()
                ? [
                    { value: 'custom', label: t.sound_custom },
                    { value: 'ringtone', label: t.sound_ringtone },
                  ]
                : [{ value: 'custom', label: t.sound_custom }]
            }
          />
          {draft.soundId === 'ringtone' && (
            <div className="ringtone-list">
              {ringtones === null && (
                <div style={{ fontSize: 13, opacity: 0.75, textAlign: 'center', fontWeight: 600 }}>{t.loadingRingtones}</div>
              )}
              {ringtones !== null && ringtones.length === 0 && (
                <div style={{ fontSize: 13, opacity: 0.75, textAlign: 'center', fontWeight: 600 }}>{t.noRingtones}</div>
              )}
              {ringtones?.map(ringtone => (
                <button
                  key={ringtone.uri}
                  className={`ringtone-item ${draft.ringtoneUri === ringtone.uri ? 'on' : ''}`}
                  onClick={() => {
                    tapHaptic()
                    patch({ ringtoneUri: ringtone.uri, ringtoneName: ringtone.title })
                    alarmSound.preview('ringtone', ringtone.uri)
                  }}
                >
                  {ringtone.title}
                </button>
              ))}
            </div>
          )}
          {draft.soundId === 'custom' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={e => handleSoundFile(e.target.files?.[0])}
              />
              <PressButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
                {t.pickSoundFile}
              </PressButton>
              <div style={{ fontSize: 13, opacity: 0.75, textAlign: 'center', fontWeight: 600 }}>
                {customSoundName ?? t.noSoundFile}
              </div>
            </>
          )}
          <div className="row" style={{ marginTop: 4 }}>
            <span style={{ fontWeight: 600 }}>{t.vibrate}</span>
            <WToggle on={draft.vibrate} onChange={vibrate => patch({ vibrate })} />
          </div>
          <div className="row">
            <span style={{ fontWeight: 600 }}>{t.volumeRamp}</span>
            <WToggle on={draft.volumeRamp} onChange={volumeRamp => patch({ volumeRamp })} />
          </div>
        </div>

        <PressButton variant="dark" onClick={save} style={{ fontSize: 17, padding: '16px 22px' }}>
          {t.save}
        </PressButton>
        {existing && !confirmingDelete && (
          <PressButton variant="ghost" onClick={() => setConfirmingDelete(true)}>
            {t.delete}
          </PressButton>
        )}
        {existing && confirmingDelete && (
          <div className="card card--dark stack" style={{ textAlign: 'center' }}>
            <span style={{ fontWeight: 700 }}>{t.deleteConfirmTitle}</span>
            <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
              <PressButton variant="ghost" onClick={() => setConfirmingDelete(false)}>
                {t.cancel}
              </PressButton>
              <PressButton
                variant="dark"
                onClick={() => {
                  deleteAlarm(existing.id)
                  setScreen({ name: 'home' })
                }}
              >
                {t.deleteConfirmYes}
              </PressButton>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  )
}

// ===== EXPORT =====
export default EditAlarm
