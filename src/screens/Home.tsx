// external libs
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// internal — absolute paths
import type { Alarm, Folder } from '@/types'
import { newFolder } from '@/types'
import { useStore } from '@/store'
import { PressButton, WToggle, ScreenShell, GearIcon, FolderIcon, FolderPlusIcon } from '@/components/ui'
import { AlarmCard, formatTime } from '@/components/AlarmCard'
import { nextOccurrence, formatCountdown } from '@/alarm/scheduler'
import { canCreateAlarm, canCreateFolder, isPro } from '@/plan'
import Paywall from '@/components/Paywall'
import type { PaywallProps } from '@/components/Paywall'

// ===== CONFIGURATIONS =====
const CLOCK_TICK_MS = 1000

// ===== UTILITIES =====
const alarmMinutes = (alarm: Alarm): number => alarm.hour * 60 + alarm.minute

const byTime = (a: Alarm, b: Alarm): number => alarmMinutes(a) - alarmMinutes(b)

// ===== MAIN COMPONENT =====
const Home = () => {
  const {
    alarms,
    folders,
    settings,
    t,
    foldersAreLocked,
    setScreen,
    toggleAlarm,
    upsertFolder,
    setFolderEnabled,
  } = useStore()
  const [now, setNow] = useState(Date.now())
  const [paywallReason, setPaywallReason] = useState<PaywallProps['reason'] | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const clock = new Date(now)
  const folderIds = new Set(folders.map(folder => folder.id))
  const looseAlarms = [...alarms].filter(alarm => !alarm.folderId || !folderIds.has(alarm.folderId)).sort(byTime)
  const activeAlarms = foldersAreLocked ? looseAlarms : alarms

  const nextAlarm = activeAlarms
    .map(alarm => ({ alarm, at: nextOccurrence(alarm, now) }))
    .filter((entry): entry is { alarm: Alarm; at: number } => entry.at !== null)
    .sort((a, b) => a.at - b.at)[0]

  const folderAlarms = (folder: Folder): Alarm[] => alarms.filter(alarm => alarm.folderId === folder.id).sort(byTime)

  const folderNextLabel = (list: Alarm[]): string => {
    if (foldersAreLocked) return ''
    const next = list
      .map(alarm => nextOccurrence(alarm, now))
      .filter((at): at is number => at !== null)
      .sort((a, b) => a - b)[0]
    return next ? ` · ${t.nextShort} ${formatCountdown(next - now)}` : ''
  }

  const createFolder = () => {
    if (!canCreateFolder(settings.plan)) {
      setPaywallReason('folders')
      return
    }
    const folder = newFolder(t.newFolder)
    upsertFolder(folder)
    setScreen({ name: 'folder', folderId: folder.id })
  }

  const openNewAlarm = () => {
    if (!canCreateAlarm(settings.plan, alarms)) {
      setPaywallReason('alarms')
      return
    }
    setScreen({ name: 'edit' })
  }

  const openFolder = (folderId: string) => {
    if (foldersAreLocked) {
      setPaywallReason('folderLocked')
      return
    }
    setScreen({ name: 'folder', folderId })
  }

  const isEmpty = folders.length === 0 && looseAlarms.length === 0

  return (
    <ScreenShell color="amber">
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="screen-title">{t.appName}</span>
        <PressButton variant="ghost" onClick={() => setScreen({ name: 'settings' })} style={{ padding: '12px 14px' }}>
          <GearIcon />
        </PressButton>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
        style={{ textAlign: 'center', margin: '18px 0 6px' }}
      >
        <div className="clock-big" style={{ fontSize: 'clamp(54px, 19vw, 84px)', lineHeight: 1 }}>
          {formatTime(clock.getHours(), clock.getMinutes())}
        </div>
        {nextAlarm && (
          <div style={{ marginTop: 8, fontWeight: 600, opacity: 0.8, fontSize: 14 }}>
            {formatTime(nextAlarm.alarm.hour, nextAlarm.alarm.minute)} · {t.ringsIn} {formatCountdown(nextAlarm.at - now)}
          </div>
        )}
      </motion.div>

      <div className="stack" style={{ marginTop: 22, paddingBottom: 140 }}>
        {isEmpty && (
          <div className="card card--dark" style={{ textAlign: 'center', whiteSpace: 'pre-line', padding: '30px 20px', fontWeight: 600 }}>
            {t.noAlarms}
          </div>
        )}

        {folders.map((folder, index) => {
          const list = folderAlarms(folder)
          const anyOn = !foldersAreLocked && list.some(alarm => alarm.enabled)
          const count = list.length
          return (
            <motion.div
              key={folder.id}
              className={`card folder-card ${anyOn ? '' : 'off'} ${foldersAreLocked ? 'locked' : ''}`}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.06 * index, type: 'spring', stiffness: 300, damping: 26 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openFolder(folder.id)}
            >
              <span className="folder-glyph"><FolderIcon /></span>
              <div className="meta">
                <div className="folder-name">{folder.name}</div>
                <div className="days">
                  {foldersAreLocked
                    ? t.folderLocked
                    : `${count} ${count === 1 ? t.alarmOne : t.alarmMany}${folderNextLabel(list)}`}
                </div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <WToggle
                  on={anyOn}
                  onChange={enabled => {
                    if (foldersAreLocked) {
                      setPaywallReason('folderLocked')
                      return
                    }
                    setFolderEnabled(folder.id, enabled)
                  }}
                />
              </div>
            </motion.div>
          )
        })}

        {looseAlarms.map((alarm, index) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            t={t}
            index={folders.length + index}
            onOpen={() => setScreen({ name: 'edit', alarmId: alarm.id })}
            onToggle={enabled => toggleAlarm(alarm.id, enabled)}
          />
        ))}

        {!isPro(settings.plan) && (
          <PressButton variant="ghost" onClick={() => setPaywallReason('generic')} style={{ fontSize: 14 }}>
            {t.proLabel} · R$ 6{t.paywallPerMonth}
          </PressButton>
        )}
      </div>

      <div className="fab">
        <PressButton variant="ghost round" onClick={createFolder} style={{ width: 54, height: 54 }}>
          <FolderPlusIcon />
        </PressButton>
        <PressButton variant="dark round" onClick={openNewAlarm}>
          +
        </PressButton>
      </div>

      <AnimatePresence>
        {paywallReason && <Paywall reason={paywallReason} onClose={() => setPaywallReason(null)} />}
      </AnimatePresence>
    </ScreenShell>
  )
}

// ===== EXPORT =====
export default Home
