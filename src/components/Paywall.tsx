// external libs
import { motion } from 'framer-motion'

// internal — absolute paths
import { useStore } from '@/store'
import { PressButton } from '@/components/ui'
import { FREE_ALARM_LIMIT, PRO_PRICE_BRL } from '@/plan'

// ===== TYPES =====
interface Props {
  reason: 'alarms' | 'folders' | 'puzzles' | 'difficulty' | 'folderLocked' | 'generic'
  onClose: () => void
}

// ===== MAIN COMPONENT =====
const Paywall = ({ reason, onClose }: Props) => {
  const { t, activatePro } = useStore()

  const reasonText = {
    alarms: t.paywallReasonAlarms.replace('{n}', String(FREE_ALARM_LIMIT)),
    folders: t.paywallReasonFolders,
    puzzles: t.paywallReasonPuzzles,
    difficulty: t.paywallReasonDifficulty,
    folderLocked: t.paywallReasonFolderLocked,
    generic: t.paywallReasonGeneric,
  }[reason]

  const subscribe = () => {
    activatePro()
    onClose()
  }

  return (
    <motion.div
      className="paywall-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="paywall-sheet"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="paywall-eyebrow">{t.proLabel}</div>
        <div className="paywall-title">{t.paywallTitle}</div>
        <div className="paywall-reason">{reasonText}</div>
        <ul className="paywall-list">
          <li>{t.paywallFeatureAlarms}</li>
          <li>{t.paywallFeatureFolders}</li>
          <li>{t.paywallFeaturePuzzles}</li>
          <li>{t.paywallFeatureDifficulty}</li>
        </ul>
        <div className="paywall-price">
          R$ {PRO_PRICE_BRL}
          <span>{t.paywallPerMonth}</span>
        </div>
        <PressButton variant="dark" onClick={subscribe} style={{ width: '100%', fontSize: 17, padding: '16px 22px' }}>
          {t.paywallSubscribe}
        </PressButton>
        <PressButton variant="ghost" onClick={onClose} style={{ width: '100%' }}>
          {t.paywallLater}
        </PressButton>
      </motion.div>
    </motion.div>
  )
}

// ===== EXPORT =====
export default Paywall
export type { Props as PaywallProps }
