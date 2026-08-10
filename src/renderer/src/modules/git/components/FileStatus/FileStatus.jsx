import React, { useState, useEffect, useRef } from 'react'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import { FileCode, FolderOpen, ExternalLink, FileX } from 'lucide-react'
import { FileList } from './FileList'
import { FileContextMenu } from './FileContextMenu'
import { useFileSelection } from './useFileSelection'
import { isBinaryFile, isImageFile } from './binaryFiles'
import styles from './FileStatus.module.css'

export const FileStatus = ({
  fileStatus,
  repoPath,
  selectedFileDiff,
  onFileClick,
  onStageFile,
  onUnstageFile,
  onDiscardChanges,
  onRemoveFile,
  getStatusIcon,
  onRefresh,
  onStashFile,
  loading
}) => {
  const [listWidth, setListWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)
  const [activeFile, setActiveFile] = useState(null)
  // Inline image preview for binary image files: { status, url }
  const [imagePreview, setImagePreview] = useState({ status: 'idle', url: null })
  const [searchTerm, setSearchTerm] = useState('')
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    fileName: null
  })

  const {
    selectedFiles,
    handleFileClick: handleSelectionClick,
    clearSelection,
    isFileSelected,
    getSelectedFiles,
    isMultipleSelection,
    cleanupInvalidSelections
  } = useFileSelection()

  const _fileStatus = fileStatus || []

  // Clean up invalid selections when file list changes
  useEffect(() => {
    if (_fileStatus.length > 0) {
      const validFileKeys = new Set(_fileStatus.map((f) => `${f.file}-${f.isStaged}`))
      cleanupInvalidSelections(validFileKeys)
    }
  }, [_fileStatus, cleanupInvalidSelections])

  // Load an inline image preview when the selected file is a binary image.
  // Ignores stale responses if the user clicks another file mid-flight.
  useEffect(() => {
    if (!activeFile || !isImageFile(activeFile.file) || !window.git?.getImagePreview) {
      setImagePreview({ status: 'idle', url: null })
      return
    }
    let cancelled = false
    setImagePreview({ status: 'loading', url: null })
    window.git
      .getImagePreview(activeFile.file, activeFile.isStaged)
      .then((res) => {
        if (cancelled) return
        if (res?.success && res.data?.dataUrl) {
          setImagePreview({ status: 'ready', url: res.data.dataUrl })
        } else {
          setImagePreview({ status: 'error', url: null })
        }
      })
      .catch(() => {
        if (!cancelled) setImagePreview({ status: 'error', url: null })
      })
    return () => {
      cancelled = true
    }
  }, [activeFile])

  // Resize handlers
  const handleMouseDown = (e) => {
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    const container = document.querySelector(`.${styles.fileStatusContainer}`)
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const calculatedWidth = e.clientX - containerRect.left
      if (calculatedWidth > 200 && calculatedWidth < 800) {
        setListWidth(calculatedWidth)
      }
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // File click handler
  const handleFileClick = (file, isStaged, e) => {
    // Pass ALL files with their staging status (not filtered by search)
    // This ensures shift-select can find the correct indices
    const allFilesWithStatus = _fileStatus.map((f) => ({ file: f.file, isStaged: f.isStaged }))

    // Perform selection logic
    handleSelectionClick(file, isStaged, e, allFilesWithStatus)

    const isShiftClick = e && e.shiftKey
    const isSameActiveFile = activeFile?.file === file && activeFile?.isStaged === isStaged

    // Only load diff for normal clicks (not shift multi-select)
    // Skip reload when the file is already the active/focused one
    if (!isShiftClick && !isSameActiveFile) {
      setActiveFile({ file, isStaged })
      onFileClick({ file, isStaged })
    }
  }

  // Context menu handlers
  const handleContextMenu = (e, fileName, isStaged) => {
    e.preventDefault()
    const isMultiSelect = isMultipleSelection() && isFileSelected(fileName, isStaged)

    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      fileName,
      isStaged,
      isMultipleSelection: isMultiSelect
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, fileName: null })
  }

  const isNewFile = (fileName) => {
    const file = _fileStatus.find((f) => f.file === fileName)
    if (!file) return false
    const { staged, working } = file.statusType
    return staged === 'A' || working === 'A' || staged === '?' || working === '?'
  }

  // Stage/Unstage all handlers
  const handleStageAll = () => {
    const unstagedFiles = _fileStatus.filter((f) => !f.isStaged).map((f) => f.file)
    if (unstagedFiles.length > 0) {
      onStageFile(unstagedFiles)
    }
  }

  const handleUnstageAll = () => {
    const stagedFiles = _fileStatus.filter((f) => f.isStaged).map((f) => f.file)
    if (stagedFiles.length > 0) {
      onUnstageFile(stagedFiles)
    }
  }

  // Open in explorer
  const handleOpenInExplorer = () => {
    if (window.git && window.git.openInExplorer) {
      window.git.openInExplorer(repoPath)
    }
  }

  // Parse diff for display (memoized)
  const parseDiff = React.useMemo(() => {
    return (diffText) => {
      if (!diffText) return []
      const lines = diffText.split('\n')
      const result = []
      let leftLine = 0
      let rightLine = 0

      lines.forEach((line) => {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
          if (match) {
            leftLine = parseInt(match[1])
            rightLine = parseInt(match[2])
            result.push({ type: 'hunk', content: line, leftLine: '...', rightLine: '...' })
          }
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          result.push({ type: 'add', content: line, leftLine: '', rightLine: rightLine++ })
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          result.push({ type: 'del', content: line, leftLine: leftLine++, rightLine: '' })
        } else if (line.startsWith(' ') || line === '') {
          result.push({
            type: 'context',
            content: line,
            leftLine: leftLine++,
            rightLine: rightLine++
          })
        } else {
          result.push({ type: 'info', content: line, leftLine: '', rightLine: '' })
        }
      })
      return result
    }
  }, [])

  const diffLines = React.useMemo(() => parseDiff(selectedFileDiff), [selectedFileDiff, parseDiff])

  // Refresh the active file's diff when the window regains focus, so external
  // edits (terminal, editor) show up without the user re-clicking the file.
  // Reading via refs because onFileClick is an inline arrow at the page level
  // (new identity every render) — without refs this effect would re-bind on
  // every render and could miss a focus event mid-rebind.
  const activeFileRef = useRef(activeFile)
  const onFileClickRef = useRef(onFileClick)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    activeFileRef.current = activeFile
    onFileClickRef.current = onFileClick
    onRefreshRef.current = onRefresh
  })

  useEffect(() => {
    let lastRefresh = 0
    const refresh = () => {
      // Debounce: focus / visibilitychange / Electron IPC can all fire on the
      // same return-from-background. 300ms is short enough to feel instant,
      // long enough to dedupe.
      const now = Date.now()
      if (now - lastRefresh < 300) return
      lastRefresh = now

      onRefreshRef.current?.()
      const active = activeFileRef.current
      if (active) {
        onFileClickRef.current({ file: active.file, isStaged: active.isStaged })
      }
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    // Primary signal on macOS — the BrowserWindow 'focus' event from the
    // main process. DOM focus is unreliable when the user returns via dock
    // click / mission control / cmd-tab; the IPC version is authoritative.
    const unsubscribeIpc = window.git?.onWindowFocus?.(refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
      unsubscribeIpc?.()
    }
  }, [])

  // Separate files by staging status and apply search filter
  const filteredFiles = React.useMemo(() => {
    const filtered = _fileStatus.filter((file) =>
      file.file.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return {
      staged: filtered.filter((file) => file.isStaged),
      unstaged: filtered.filter((file) => !file.isStaged)
    }
  }, [_fileStatus, searchTerm])

  const stagedFiles = filteredFiles.staged
  const unstagedFiles = filteredFiles.unstaged

  // Keyboard navigation — scoped to the active file's section so up/down stays
  // within either the staging area or the working directory. Walking the same
  // rendered lists (rather than the flat _fileStatus) keeps each section's
  // navigation independent and unaffected by same-named files in the other.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()

        const sectionFiles = activeFile?.isStaged ? stagedFiles : unstagedFiles
        if (sectionFiles.length === 0) return

        const currentIndex = sectionFiles.findIndex((file) => file.file === activeFile?.file)

        let nextIndex
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : sectionFiles.length - 1
        } else {
          nextIndex = currentIndex < sectionFiles.length - 1 ? currentIndex + 1 : 0
        }

        const nextFile = sectionFiles[nextIndex]
        handleFileClick(nextFile.file, nextFile.isStaged, null)
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [stagedFiles, unstagedFiles, activeFile])

  // After staging/unstaging the active file, advance to the next file in the
  // same section so the user can keep reviewing without re-clicking.
  const advanceActiveFile = (file, fromStaged) => {
    if (typeof file !== 'string') return
    if (activeFile?.file !== file || activeFile?.isStaged !== fromStaged) return
    const list = fromStaged ? filteredFiles.staged : filteredFiles.unstaged
    const idx = list.findIndex((f) => f.file === file)
    if (idx === -1) return
    const next = list[idx + 1] || list[idx - 1] || null
    if (next) {
      setActiveFile({ file: next.file, isStaged: fromStaged })
      onFileClick({ file: next.file, isStaged: fromStaged })
    } else {
      setActiveFile(null)
    }
  }

  const handleStageFile = (file) => {
    advanceActiveFile(file, false)
    onStageFile(file)
  }

  const handleUnstageFile = (file) => {
    advanceActiveFile(file, true)
    onUnstageFile(file)
  }

  if (!loading && _fileStatus.length === 0) {
    return (
      <div className={styles.fileStatusPanel}>
        <div className={styles.fileStatusHeader}>
          <div className={styles.headerTitle}>
            <FileCode size={18} />
            <span>Changes</span>
          </div>
          <RefreshButton
            onClick={onRefresh}
            disabled={loading}
            title="Refresh status"
            text="Refresh"
          />
        </div>
        <div className={styles.noChangesView}>
          <div className={styles.noChangesIcon}>
            <FolderOpen size={48} />
          </div>
          <p>No file changes detected.</p>
          <button onClick={handleOpenInExplorer} className={styles.openFolderBtn}>
            <ExternalLink size={16} style={{ marginRight: '8px' }} />
            Open In Explorer / Finder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.fileStatusPanel}>
      <div className={styles.fileStatusHeader}>
        <div className={styles.headerTitle}>
          <FileCode size={18} />
          <span>Changes</span>
          <span className={styles.totalCount}>
            ({_fileStatus.length}{' '}
            {searchTerm && `/ ${stagedFiles.length + unstagedFiles.length} filtered`})
          </span>
        </div>
        <div className={styles.headerActions}>
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <RefreshButton
            onClick={onRefresh}
            disabled={loading}
            title="Refresh status"
            text="Refresh"
          />
        </div>
      </div>
      <div className={styles.fileStatusContainer}>
        <div
          className={styles.fileListPanel}
          style={{ width: `${listWidth}px`, flex: 'none', maxWidth: 'none' }}
        >
          <div className={styles.fileSection}>
            <FileList
              title="Staging Area"
              files={stagedFiles}
              isStaged={true}
              activeFile={activeFile}
              selectedFiles={selectedFiles}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              onStageFile={handleStageFile}
              onUnstageFile={handleUnstageFile}
              getStatusIcon={getStatusIcon}
              onStageAll={handleUnstageAll}
              onUnstageAll={handleUnstageAll}
              loading={loading}
            />
          </div>
          <div className={styles.fileSection}>
            <FileList
              title="Working Directory"
              files={unstagedFiles}
              isStaged={false}
              activeFile={activeFile}
              selectedFiles={selectedFiles}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              onStageFile={handleStageFile}
              onUnstageFile={handleUnstageFile}
              getStatusIcon={getStatusIcon}
              onStageAll={handleStageAll}
              onUnstageAll={handleUnstageAll}
              loading={loading}
            />
          </div>
        </div>

        <div
          className={`${styles.resizer} ${isResizing ? styles.isResizing : ''}`}
          onMouseDown={handleMouseDown}
        />

        <div className={styles.diffPanel}>
          {activeFile ? (
            <div className={styles.diffContent}>
              <div className={styles.diffHeader}>
                <div className={styles.diffTitle}>
                  <FileCode size={16} />
                  <h4>{activeFile.file}</h4>
                </div>
                <span
                  className={`${styles.diffType} ${activeFile.isStaged ? styles.staged : styles.unstaged}`}
                >
                  {activeFile.isStaged ? 'Staged' : 'Modified'}
                </span>
              </div>
              <div className={styles.diffBody}>
                {isBinaryFile(activeFile.file, selectedFileDiff) ? (
                  isImageFile(activeFile.file) && imagePreview.status !== 'error' ? (
                    <div className={styles.imagePreview}>
                      {imagePreview.status === 'ready' ? (
                        <img
                          src={imagePreview.url}
                          alt={activeFile.file}
                          className={styles.imagePreviewImg}
                        />
                      ) : (
                        <div className={styles.emptyDiff}>Loading image…</div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.emptyDiff}>
                      <FileX size={32} style={{ marginBottom: 8, opacity: 0.6 }} />
                      <p>No preview available</p>
                      <p style={{ fontSize: '0.85em', opacity: 0.7 }}>
                        Binary file — diff cannot be displayed.
                      </p>
                    </div>
                  )
                ) : diffLines.length > 0 ? (
                  <div className={styles.diffLines}>
                    {diffLines.map((line, idx) => (
                      <div key={idx} className={`${styles.diffLine} ${styles[line.type]}`}>
                        <div className={styles.lineNumber}>{line.leftLine}</div>
                        <div className={styles.lineNumber}>{line.rightLine}</div>
                        <div className={styles.lineContent}>{line.content}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyDiff}>
                    {loading ? 'Fetching diff...' : 'No changes to display or untracked file.'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyDiffStatus}>
              <FileCode size={48} />
              <p>Select a file to view changes</p>
            </div>
          )}
        </div>
      </div>

      <FileContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        fileName={contextMenu.fileName}
        isStaged={contextMenu.isStaged}
        isMultipleSelection={contextMenu.isMultipleSelection}
        selectedCount={selectedFiles.size}
        selectedFiles={getSelectedFiles()}
        onClose={closeContextMenu}
        onDiscardChanges={onDiscardChanges}
        onRemoveFile={onRemoveFile}
        onStashFile={onStashFile}
        onStageFile={handleStageFile}
        onUnstageFile={handleUnstageFile}
        isNewFile={isNewFile}
      />
    </div>
  )
}

export default FileStatus
