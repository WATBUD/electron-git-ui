import React, { useEffect, useRef } from 'react'
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react'
import { ModalPortal } from '../ModalPortal'
import styles from './ResultDialog.module.css'

const VARIANT_ICON = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle
}

export const ResultDialog = ({
  show,
  variant = 'info',
  title,
  content,
  onClose
}) => {
  const okBtnRef = useRef(null)

  useEffect(() => {
    if (!show) return
    okBtnRef.current?.focus()
    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [show, onClose])

  if (!show) return null

  const Icon = VARIANT_ICON[variant] || Info

  return (
    <ModalPortal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <div className={`${styles.iconWrap} ${styles[variant]}`}>
              <Icon size={20} />
            </div>
            <h3 className={styles.title}>{title}</h3>
          </div>
          <div className={styles.content}>{content}</div>
          <div className={styles.actions}>
            <button ref={okBtnRef} className={styles.okBtn} onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default ResultDialog
