import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Copy, Check } from 'lucide-react'
import styles from './ErrorModal.module.css'

export const ErrorModal = ({ error, onClose, show = false }) => {
  const [copied, setCopied] = useState(false)

  if (!show || !error) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleClose = () => {
    setCopied(false)
    onClose?.()
  }

  return (
    <div className={styles.errorModalOverlay} onClick={handleClose}>
      <div className={styles.errorModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.errorModalHeader}>
          <h3>⚠️ Error</h3>
          <button
            className={`${styles.copyErrorBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
            title="Copy error message"
            type="button"
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className={styles.errorModalBody}>
          <pre className={styles.errorMessage}>{error}</pre>
        </div>
        <div className={styles.errorModalFooter}>
          <button className={styles.errorModalOkBtn} onClick={handleClose} type="button">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

ErrorModal.propTypes = {
  /** The error message to display */
  error: PropTypes.string,
  /** Callback when the modal is closed */
  onClose: PropTypes.func.isRequired,
  /** Controls the visibility of the modal */
  show: PropTypes.bool
}
