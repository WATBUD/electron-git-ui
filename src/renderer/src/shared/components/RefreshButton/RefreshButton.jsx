import React from 'react'
import styles from './RefreshButton.module.css'

export const RefreshButton = ({ onClick, disabled, title, text }) => {
  return (
    <button onClick={onClick} disabled={disabled} className={styles.refreshButton} title={title}>
      <span className={styles.refreshIcon}>🔄</span>
      <span className={styles.refreshText}>{text}</span>
    </button>
  )
}
