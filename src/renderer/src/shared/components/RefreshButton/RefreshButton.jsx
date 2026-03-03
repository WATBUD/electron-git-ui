import React, { forwardRef } from 'react'
import styles from './RefreshButton.module.css'

export const RefreshButton = forwardRef(({ onClick, disabled, title, text, ...props }, ref) => {
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={styles.refreshButton}
      {...props}
    >
      <span className={styles.refreshIcon}>🔄</span>
      <span className={styles.refreshText}>{text}</span>
    </button>
  )
})

export default RefreshButton
