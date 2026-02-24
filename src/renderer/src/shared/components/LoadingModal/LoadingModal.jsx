import React from 'react'
import styles from './LoadingModal.module.css'

export const LoadingModal = ({ message }) => {
  if (!message) return null

  return (
    <div className={styles.loadingModal}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loadingMessage}>{message}</div>
      </div>
    </div>
  )
}
