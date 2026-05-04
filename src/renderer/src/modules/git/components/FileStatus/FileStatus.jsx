import React, { useState, useEffect } from 'react'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import { FileCode, FolderOpen, ExternalLink } from 'lucide-react'
import { FileList } from './FileList'
import { FileContextMenu } from './FileContextMenu'
import { useFileSelection } from './useFileSelection'
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
      const validFileKeys = new Set(
        _fileStatus.map(f => `${f.file}-${f.isStaged}`)
      )
      cleanupInvalidSelections(validFileKeys)
    }
  }, [_fileStatus, cleanupInvalidSelections])

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
    const allFilesWithStatus = _fileStatus.map(f => ({ file: f.file, isStaged: f.isStaged }))
    
    // Perform selection logic
    handleSelectionClick(file, isStaged, e, allFilesWithStatus)
    
    // Only load diff for normal clicks (not shift multi-select)
    // Cmd/Ctrl clicks should still load diff as they toggle individual files
    const isShiftClick = e && e.shiftKey
    if (!isShiftClick) {
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
    const file = _fileStatus.find(f => f.file === fileName)
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        
        const currentIndex = _fileStatus.findIndex(
          (file) => file.file === activeFile?.file && file.isStaged === activeFile?.isStaged
        )
        
        let nextIndex
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : _fileStatus.length - 1
        } else {
          nextIndex = currentIndex < _fileStatus.length - 1 ? currentIndex + 1 : 0
        }
        
        if (nextIndex >= 0 && nextIndex < _fileStatus.length) {
          const nextFile = _fileStatus[nextIndex]
          handleFileClick(nextFile.file, nextFile.isStaged, null)
        }
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [_fileStatus, activeFile])

  // Separate files by staging status and apply search filter
  const filteredFiles = React.useMemo(() => {
    const filtered = _fileStatus.filter(file => 
      file.file.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return {
      staged: filtered.filter(file => file.isStaged),
      unstaged: filtered.filter(file => !file.isStaged)
    }
  }, [_fileStatus, searchTerm])

  const stagedFiles = filteredFiles.staged
  const unstagedFiles = filteredFiles.unstaged

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
            ({_fileStatus.length} {searchTerm && `/ ${stagedFiles.length + unstagedFiles.length} filtered`})
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
          <FileList
            title="Staging Area"
            files={stagedFiles}
            isStaged={true}
            activeFile={activeFile}
            selectedFiles={selectedFiles}
            onFileClick={handleFileClick}
            onContextMenu={handleContextMenu}
            onStageFile={onStageFile}
            onUnstageFile={onUnstageFile}
            getStatusIcon={getStatusIcon}
            onStageAll={handleUnstageAll}
            onUnstageAll={handleUnstageAll}
            loading={loading}
          />
          <FileList
            title="Working Directory"
            files={unstagedFiles}
            isStaged={false}
            activeFile={activeFile}
            selectedFiles={selectedFiles}
            onFileClick={handleFileClick}
            onContextMenu={handleContextMenu}
            onStageFile={onStageFile}
            onUnstageFile={onUnstageFile}
            getStatusIcon={getStatusIcon}
            onStageAll={handleStageAll}
            onUnstageAll={handleUnstageAll}
            loading={loading}
          />
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
                {diffLines.length > 0 ? (
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
        isMultipleSelection={contextMenu.isMultipleSelection}
        selectedCount={selectedFiles.size}
        selectedFiles={getSelectedFiles()}
        onClose={closeContextMenu}
        onDiscardChanges={onDiscardChanges}
        onRemoveFile={onRemoveFile}
        onStashFile={onStashFile}
        isNewFile={isNewFile}
      />
    </div>
  )
}

export default FileStatus
