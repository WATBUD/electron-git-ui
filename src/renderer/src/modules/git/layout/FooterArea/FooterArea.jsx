import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import styles from './FooterArea.module.css'
import { GitHistory } from '../../components/GitHistory/GitHistory'

export const FooterArea = () => {
  const gitState = useSelector((state) => state.git)
  const [activeCommandTab, setActiveCommandTab] = useState('history')
  const [height, setHeight] = useState(200)
  const [isResizing, setIsResizing] = useState(false)
  const footerRef = useRef(null)
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
      {activeCommandTab === 'history' && <GitHistory />}
      {activeCommandTab === 'terminal' && (
        <div className={styles.terminalContainer}>
          <div className={styles.terminalContent}>Terminal content will be implemented here</div>
        </div>
      )}
    </div>
  )
}
