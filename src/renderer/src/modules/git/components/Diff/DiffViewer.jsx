import React, { useCallback, useEffect, useRef, useState } from 'react'
import { diffLineKind } from './parseDiff'
import styles from './Diff.module.css'

const MIN_LIST_WIDTH = 160
const MAX_LIST_WIDTH = 600
const DEFAULT_LIST_WIDTH = 280

/**
 * Generic diff renderer with a resizable split layout:
 *   [ file list ] | [ selected file diff ]
 *
 * Props:
 *   parsedFiles  – output of parseDiff().files: [{ path, lines: string[] }]
 *   fileMeta     – optional [{ file, oldFile?, status }] for rename/status badges
 *   selectedPath – externally controlled or fall back to internal state
 *   onSelectPath – called when user picks a file (optional; if omitted, internal)
 *   defaultListWidth – pixels, default 280
 */
export const DiffViewer = ({
  parsedFiles = [],
  fileMeta = [],
  selectedPath: controlledPath,
  onSelectPath,
  defaultListWidth = DEFAULT_LIST_WIDTH
}) => {
  const [listWidth, setListWidth] = useState(defaultListWidth)
  const [internalPath, setInternalPath] = useState(null)
  const splitRef = useRef(null)
  const draggingRef = useRef(false)

  const selectedPath = controlledPath !== undefined ? controlledPath : internalPath
  const setSelected = useCallback(
    (path) => {
      if (onSelectPath) onSelectPath(path)
      if (controlledPath === undefined) setInternalPath(path)
    },
    [onSelectPath, controlledPath]
  )

  // Auto-select first file when content first arrives.
  useEffect(() => {
    if (selectedPath !== null && selectedPath !== undefined) return
    if (parsedFiles.length > 0) setSelected(parsedFiles[0].path)
  }, [parsedFiles, selectedPath, setSelected])

  // Resizer drag
  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      const next = Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, e.clientX - rect.left))
      setListWidth(next)
    }
    const handleUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  const selectedFile = parsedFiles.find((f) => f.path === selectedPath) || null

  return (
    <div className={styles.split} ref={splitRef}>
      <div className={styles.fileList} style={{ width: `${listWidth}px` }}>
        {parsedFiles.map((f) => {
          const meta = fileMeta.find((it) => it.file === f.path || it.oldFile === f.path)
          const status = meta?.status
          const isActive = selectedPath === f.path
          const displayName = meta?.oldFile ? `${meta.oldFile} → ${meta.file}` : f.path
          return (
            <button
              key={f.path}
              type="button"
              className={`${styles.fileItem} ${isActive ? styles.fileItemActive : ''}`}
              onClick={() => setSelected(f.path)}
              title={displayName}
            >
              {status && (
                <span
                  className={`${styles.fileStatus} ${
                    styles[`status_${status.charAt(0)}`] || ''
                  }`}
                >
                  {status}
                </span>
              )}
              <span className={styles.fileName}>{displayName}</span>
            </button>
          )
        })}
      </div>
      <div
        className={styles.resizer}
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
      />
      <div className={styles.detail}>
        {selectedFile ? (
          <pre className={styles.content}>
            {selectedFile.lines.map((line, idx) => (
              <div key={idx} className={styles[diffLineKind(line)]}>
                {line || ' '}
              </div>
            ))}
          </pre>
        ) : (
          <div className={styles.empty}>Select a file to view its diff</div>
        )}
      </div>
    </div>
  )
}

export default DiffViewer
