import React from 'react'
import { AlertTriangle } from 'lucide-react'
import styles from './ConfirmDialog.module.css'

export const ConfirmDialog = ({
  show,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger' // 'danger', 'warning', 'info'
}) => {
  if (!show) return null

  const handleConfirm = () => {
    onConfirm()
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={20} className={styles[`icon-${variant}`]} />
          </div>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.dialogBody}>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.dialogFooter}>
          <button onClick={handleCancel} className={styles.cancelBtn}>
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`${styles.confirmBtn} ${styles[`confirmBtn-${variant}`]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
