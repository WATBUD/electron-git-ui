import React, { useEffect, useRef } from 'react'
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
  variant = 'danger', // 'danger', 'warning', 'info'
  toggle, // optional: { label, hint }
  toggleValue = false,
  onToggleChange
}) => {
  const confirmBtnRef = useRef(null)

  // Keyboard shortcuts while dialog is open:
  //   Enter → confirm (matches the focused confirm button)
  //   Escape → cancel
  useEffect(() => {
    if (!show) return
    // Move focus to the confirm button so Enter triggers it natively.
    confirmBtnRef.current?.focus()
    const handleKey = (e) => {
      if (e.key === 'Enter') {
        // Ignore Enter when the user is editing a text input (e.g. composing IME).
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        onConfirm?.()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel?.()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [show, onConfirm, onCancel])

  if (!show) return null

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={20} className={styles[`icon-${variant}`]} />
          </div>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.dialogBody}>
          <p className={styles.message}>{message}</p>
          {toggle && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                cursor: 'pointer',
                fontSize: 13,
                color: toggleValue ? '#ff6b6b' : 'rgba(255,255,255,0.85)'
              }}
            >
              <input
                type="checkbox"
                checked={toggleValue}
                onChange={(e) => onToggleChange?.(e.target.checked)}
              />
              <span>
                {toggle.label}
                {toggle.hint && (
                  <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {toggle.hint}
                  </span>
                )}
              </span>
            </label>
          )}
        </div>
        <div className={styles.dialogFooter}>
          <button onClick={onCancel} className={styles.cancelBtn}>
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`${styles.confirmBtn} ${styles[`confirmBtn-${variant}`]}`}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
