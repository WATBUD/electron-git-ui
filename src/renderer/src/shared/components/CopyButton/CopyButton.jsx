import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import styles from './CopyButton.module.css'

export const CopyButton = ({
  textToCopy,
  title = 'Copy',
  size = 14,
  className = '',
  showCopiedText = false
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  // Map potential legacy class names from prop to styles
  const resolvedClassName = className === 'hash-style' ? styles.hashStyle : className

  return (
    <button
      onClick={handleCopy}
      className={`${styles.copyButton} ${copied ? styles.copied : ''} ${resolvedClassName}`}
      title={title}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
      {showCopiedText && copied && <span className={styles.copiedText}>Copied!</span>}
    </button>
  )
}
