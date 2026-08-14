import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FolderOpen } from 'lucide-react'
import { diffLineKind } from './parseDiff'
import { isImageFile } from '../FileStatus/binaryFiles'
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
  defaultListWidth = DEFAULT_LIST_WIDTH,
  // git ref to load image previews from (e.g. a commit hash or HEAD). When set,
  // selecting an image file renders the picture instead of "Binary files differ".
  previewRef
}) => {
  const [listWidth, setListWidth] = useState(defaultListWidth)
  const [internalPath, setInternalPath] = useState(null)
  // Right-click menu for a file row: { show, x, y, path }
  const [fileMenu, setFileMenu] = useState({ show: false, x: 0, y: 0, path: null })
  const splitRef = useRef(null)
  const draggingRef = useRef(false)

  const openFileMenu = useCallback((e, path) => {
    e.preventDefault()
    e.stopPropagation()
    setFileMenu({ show: true, x: e.clientX, y: e.clientY, path })
  }, [])

  const closeFileMenu = useCallback(() => {
    setFileMenu((m) => (m.show ? { show: false, x: 0, y: 0, path: null } : m))
  }, [])

  const revealActiveFile = useCallback(() => {
    const path = fileMenu.path
    closeFileMenu()
    if (path && window.git?.revealInFolder) {
      window.git.revealInFolder(path).catch(() => {})
    }
  }, [fileMenu.path, closeFileMenu])

  useEffect(() => {
    if (!fileMenu.show) return
    const onKey = (e) => e.key === 'Escape' && closeFileMenu()
    window.addEventListener('click', closeFileMenu)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', closeFileMenu)
      window.removeEventListener('keydown', onKey)
    }
  }, [fileMenu.show, closeFileMenu])

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

  // Lazily load the selected image's preview from `previewRef` (one at a time,
  // only when an image row is selected — the file list itself loads nothing).
  const [imgPreview, setImgPreview] = useState({ status: 'idle', url: null })
  const isSelImage = !!selectedPath && isImageFile(selectedPath)
  useEffect(() => {
    if (!isSelImage || !previewRef || !window.git?.getBlobImage) {
      setImgPreview({ status: 'idle', url: null })
      return
    }
    let cancelled = false
    setImgPreview({ status: 'loading', url: null })
    window.git
      .getBlobImage(previewRef, selectedPath)
      .then((res) => {
        if (cancelled) return
        if (res?.success && res.data?.dataUrl) {
          setImgPreview({ status: 'ready', url: res.data.dataUrl })
        } else {
          setImgPreview({ status: 'error', url: null })
        }
      })
      .catch(() => !cancelled && setImgPreview({ status: 'error', url: null }))
    return () => {
      cancelled = true
    }
  }, [isSelImage, previewRef, selectedPath])

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
              onContextMenu={(e) => openFileMenu(e, meta?.file || f.path)}
              title={displayName}
            >
              {status && (
                <span
                  className={`${styles.fileStatus} ${styles[`status_${status.charAt(0)}`] || ''}`}
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
        {isSelImage && previewRef && imgPreview.status !== 'error' ? (
          <div className={styles.imagePreview}>
            {imgPreview.status === 'ready' ? (
              <img src={imgPreview.url} alt={selectedPath} className={styles.imagePreviewImg} />
            ) : (
              <div className={styles.empty}>Loading image…</div>
            )}
          </div>
        ) : selectedFile ? (
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

      {/* Portal to <body> so the menu is never trapped in the flex layout or a
          positioned/transformed ancestor — inline position:fixed keeps it
          exactly at the cursor regardless of CSS-module load timing. */}
      {fileMenu.show &&
        createPortal(
          <div
            className={styles.fileContextMenu}
            style={{ position: 'fixed', top: fileMenu.y, left: fileMenu.x, zIndex: 3000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.fileContextItem} onClick={revealActiveFile}>
              <FolderOpen size={14} />
              <span>Open containing folder</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}

export default DiffViewer
