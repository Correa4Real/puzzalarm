// external libs
import { useEffect, useState } from 'react'

// internal — absolute paths
import type { Alarm } from '@/types'
import { useStore } from '@/store'
import { PressButton, WToggle, ScreenShell } from '@/components/ui'
import { AlarmCard } from '@/components/AlarmCard'

// ===== CONFIGURATIONS =====
const FOLDER_NAME_MAX_LENGTH = 30

interface Props {
  folderId: string
}

// ===== UTILITIES =====
const byTime = (a: Alarm, b: Alarm): number => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)

// ===== MAIN COMPONENT =====
const FolderScreen = ({ folderId }: Props) => {
  const { alarms, folders, t, setScreen, toggleAlarm, upsertFolder, deleteFolder, setFolderEnabled } = useStore()
  const folder = folders.find(item => item.id === folderId)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!folder) setScreen({ name: 'home' })
  }, [folder, setScreen])

  if (!folder) return null

  const list = alarms.filter(alarm => alarm.folderId === folderId).sort(byTime)
  const anyOn = list.some(alarm => alarm.enabled)

  return (
    <ScreenShell color="amber">
      <div className="row" style={{ marginBottom: 10 }}>
        <PressButton variant="ghost" onClick={() => setScreen({ name: 'home' })} style={{ padding: '10px 14px' }}>
          {'←'}
        </PressButton>
        <span className="screen-title">{t.folder}</span>
        <span style={{ width: 48 }} />
      </div>

      <div className="stack" style={{ paddingBottom: 140 }}>
        <div className="card card--dark stack">
          <span className="label-sm">{t.folder}</span>
          <input
            className="text-input"
            value={folder.name}
            placeholder={t.folderNamePlaceholder}
            maxLength={FOLDER_NAME_MAX_LENGTH}
            onChange={e => upsertFolder({ ...folder, name: e.target.value })}
          />
          {list.length > 0 && (
            <div className="row" style={{ marginTop: 4 }}>
              <span style={{ fontWeight: 600 }}>
                {list.length} {list.length === 1 ? t.alarmOne : t.alarmMany}
              </span>
              <WToggle on={anyOn} onChange={enabled => setFolderEnabled(folderId, enabled)} />
            </div>
          )}
        </div>

        {list.length === 0 && (
          <div className="card card--dark" style={{ textAlign: 'center', whiteSpace: 'pre-line', padding: '30px 20px', fontWeight: 600 }}>
            {t.emptyFolder}
          </div>
        )}

        {list.map((alarm, index) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            t={t}
            index={index}
            onOpen={() => setScreen({ name: 'edit', alarmId: alarm.id, folderId })}
            onToggle={enabled => toggleAlarm(alarm.id, enabled)}
          />
        ))}

        {!confirmingDelete && (
          <PressButton variant="ghost" onClick={() => setConfirmingDelete(true)}>
            {t.deleteFolder}
          </PressButton>
        )}
        {confirmingDelete && (
          <div className="card card--dark stack" style={{ textAlign: 'center' }}>
            <span style={{ fontWeight: 700 }}>{t.deleteFolderConfirmTitle}</span>
            <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 600 }}>{t.deleteFolderHint}</span>
            <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
              <PressButton variant="ghost" onClick={() => setConfirmingDelete(false)}>
                {t.cancel}
              </PressButton>
              <PressButton
                variant="dark"
                onClick={() => {
                  deleteFolder(folderId)
                  setScreen({ name: 'home' })
                }}
              >
                {t.deleteConfirmYes}
              </PressButton>
            </div>
          </div>
        )}
      </div>

      <div className="fab">
        <PressButton variant="dark round" onClick={() => setScreen({ name: 'edit', folderId })}>
          +
        </PressButton>
      </div>
    </ScreenShell>
  )
}

// ===== EXPORT =====
export default FolderScreen
