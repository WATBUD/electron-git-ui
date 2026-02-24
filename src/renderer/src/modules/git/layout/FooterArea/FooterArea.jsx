import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import styles from './FooterArea.module.css'
import { Copy } from 'lucide-react'
import { clearCommandHistory } from '../../store/git'

export const FooterArea = () => {
  const dispatch = useDispatch()
  const { commandHistory, previousHistoryIndex } = useSelector((state) => ({
    commandHistory: state.git.commandHistory,
    previousHistoryIndex: state.git.previousHistoryIndex
  }))
  const gitState = useSelector((state) => state.git)
  const [activeCommandTab, setActiveCommandTab] = useState('history')
  const [height, setHeight] = useState(200)
  const [isResizing, setIsResizing] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const footerRef = useRef(null)

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    })
  }
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const rafRef = useRef(null)

  const handleMouseDown = useCallback(
    (e) => {
      setIsResizing(true)
      startYRef.current = e.clientY
      startHeightRef.current = height
      e.preventDefault()
    },
    [height]
  )

  const updateHeight = useCallback((newHeight) => {
    if (newHeight > 100 && newHeight < window.innerHeight - 100) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(() => {
        setHeight(newHeight)
      })
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      const deltaY = startYRef.current - e.clientY
      const newHeight = startHeightRef.current + deltaY
      updateHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isResizing, updateHeight])

  return (
    <div className={styles.footerArea} ref={footerRef} style={{ height: `${height}px` }}>
      <div className={styles.resizeHandle} onMouseDown={handleMouseDown} />
      {activeCommandTab === 'history' && (
        <>
          <div className={styles.commandHistoryHeader}>
            <button
              onClick={() => dispatch(clearCommandHistory())}
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
      )}
      {activeCommandTab === 'terminal' && (
        <div className={styles.terminalContainer}>
          <div className={styles.terminalContent}>Terminal content will be implemented here</div>
        </div>
      )}
    </div>
  )
}
