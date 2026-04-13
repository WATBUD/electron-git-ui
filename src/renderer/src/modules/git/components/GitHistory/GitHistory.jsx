import React, { useState } from 'react'
import { Copy } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { clearCommandHistory } from '../../store/git/gitThunks'
import styles from './GitHistory.module.css'

export const GitHistory = () => {
  const dispatch = useDispatch()
  const { commandHistory, previousHistoryIndex } = useSelector((state) => ({
    commandHistory: state.git.commandHistory,
    previousHistoryIndex: state.git.previousHistoryIndex
  }))
  const [copiedIndex, setCopiedIndex] = useState(null)

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
    <>
      <div className={styles.historyHeader}>
        <button
          onClick={handleClearHistory}
          className={styles.clearHistoryBtn}
        >
          Clear History
        </button>
      </div>
      <div className={styles.commandList}>
        {commandHistory
          .slice()
          .reverse()
          .map((command, index) => (
            <div
              key={commandHistory.length - 1 - index}
              className={`${styles.commandItem} ${
                commandHistory.length - 1 - index === previousHistoryIndex
                  ? styles.previousCommand
                  : ''
              }`}
            >
              <span className={styles.commandNumber}>{commandHistory.length - index}.</span>
              <span className={styles.commandText}>{command}</span>
              <button
                className={`${styles.copyButton} ${copiedIndex === index ? styles.copied : ''}`}
                onClick={() => copyToClipboard(command, index)}
                title="Copy command"
              >
                <Copy size={14} />
                {copiedIndex === index && <span className={styles.copiedText}>Copied!</span>}
              </button>
            </div>
          ))}
      </div>
    </>
  )
}
