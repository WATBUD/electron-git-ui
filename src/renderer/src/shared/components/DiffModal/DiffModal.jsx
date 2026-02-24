import React, { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { ModalPortal } from '../ModalPortal'
import styles from './DiffModal.module.css'

export const DiffModal = ({ diff, onClose, show }) => {
  const [copied, setCopied] = useState(false)

  if (!show) return null
  const displayDiff = diff || 'No staged changes found.'

  const handleCopy = () => {
    navigator.clipboard.writeText(displayDiff).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <ModalPortal>
      <div className={styles.diffModalOverlay} onClick={onClose}>
        <div className={styles.diffModalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.diffModalHeader}>
            <h3>Git Cached Diff</h3>
            <div className={styles.headerActions}>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopy}
                title="Copy diff to clipboard"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className={styles.diffModalBody}>
            <pre className={styles.diffText}>{displayDiff}</pre>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
