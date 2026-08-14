import React, { useState, useEffect } from 'react'
import { Copy, ExternalLink, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { clearCommandHistory, fetchCommandHistory } from '../../store/git/gitThunks'
import styles from './GitHistory.module.css'

// True when this component is rendered inside the popped-out history window.
const IS_POPOUT =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('view') === 'history'

export const GitHistory = () => {
  const dispatch = useDispatch()
  // Select each field individually — a single selector returning an object
  // literal builds a new reference every call and trips react-redux's
  // "selector returned a different result" warning / unnecessary rerenders.
  const commandHistory = useSelector((state) => state.git.commandHistory)
  const previousHistoryIndex = useSelector((state) => state.git.previousHistoryIndex)
  const [copiedIndex, setCopiedIndex] = useState(null)

  // Load history on mount, and keep in sync when the other window changes it
  // (e.g. main window runs a command while this is a popped-out window).
  useEffect(() => {
    dispatch(fetchCommandHistory())
    const unsub = window.git?.onCommandHistoryChanged?.(() => dispatch(fetchCommandHistory()))
    return unsub
  }, [dispatch])

  const handlePopOut = () => {
    window.git?.openHistoryWindow?.()
  }

  const handleClosePopout = () => {
    window.git?.closeHistoryWindow?.()
  }

  const copyToClipboard = (command, index) => {
    navigator.clipboard.writeText(command).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    })
  }

  const handleClearHistory = () => {
    dispatch(clearCommandHistory())
  }

  return (
    <div className={styles.historyContainer}>
      <div
        className={styles.historyHeader}
        // In the frameless popout, the header doubles as the drag region.
        style={IS_POPOUT ? { WebkitAppRegion: 'drag' } : undefined}
      >
        <button
          onClick={handleClearHistory}
          className={styles.clearHistoryBtn}
          style={IS_POPOUT ? { WebkitAppRegion: 'no-drag' } : undefined}
        >
          Clear History
        </button>
        {!IS_POPOUT && window.git?.openHistoryWindow && (
          <button
            onClick={handlePopOut}
            className={styles.popoutBtn}
            title="Open in separate window"
          >
            <ExternalLink size={14} />
          </button>
        )}
        {IS_POPOUT && (
          <button
            onClick={handleClosePopout}
            className={styles.closePopoutBtn}
            style={{ WebkitAppRegion: 'no-drag' }}
            title="Close and dock back to main window"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className={styles.commandList}>
        {commandHistory.length === 0 ? (
          <div className={styles.emptyHistory}>
            <span>No commands yet</span>
          </div>
        ) : (
          commandHistory
            .slice()
            .reverse()
            .map((command, index) => (
              <div
                key={commandHistory.length - 1 - index}
                className={`${styles.commandItem} ${
                  commandHistory.length - 1 - index === previousHistoryIndex
                    ? styles.previousCommand
                    : ''
                } ${copiedIndex === index ? styles.commandItemCopied : ''}`}
                onClick={() => copyToClipboard(command, index)}
                title="Click anywhere on the row to copy"
              >
                <span className={styles.commandNumber}>{commandHistory.length - index}.</span>
                <span className={styles.commandText}>{command}</span>
                <span
                  className={`${styles.copyButton} ${copiedIndex === index ? styles.copied : ''}`}
                  aria-hidden="true"
                >
                  <Copy size={13} />
                  {copiedIndex === index && <span className={styles.copiedText}>Copied!</span>}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
