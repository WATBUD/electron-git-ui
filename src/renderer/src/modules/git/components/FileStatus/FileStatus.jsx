import React, { useState } from 'react'
import { LoadingModal } from '../../../../shared/components/LoadingModal'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import styles from './FileStatus.module.css'
import { message } from 'antd'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'
import {
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  FileCode,
  FolderOpen,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Trash2,
  Archive
} from 'lucide-react'

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
  getStatusText,
  onRefresh,
  onStashFile,
  loading
}) => {
  const [listWidth, setListWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)
  const [activeFile, setActiveFile] = useState(null)
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    fileName: null
  })
  const contextMenuRef = React.useRef(null)

  const handleMouseDown = (e) => {
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    const newWidth = e.clientX - 64 // 64 is approximate LeftSideBar width if applicable, but better use a relative approach or handle it based on container offset
    // Actually, a safer way is to use the movement or calculate relative to the container
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

  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleContextMenu = (e, fileName) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      fileName: fileName
    })
  }

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ show: false, x: 0, y: 0, fileName: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopyFileName = (path) => {
    const fileName = path.split('/').pop()
    navigator.clipboard.writeText(fileName)
    message.success('File name copied to clipboard')
    setContextMenu({ show: false, x: 0, y: 0, fileName: null })
  }

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path)
    message.success('Full path copied to clipboard')
    setContextMenu({ show: false, x: 0, y: 0, fileName: null })
  }

  const handleDiscardFromMenu = (fileName) => {
    onDiscardChanges(fileName)
    setContextMenu({ show: false, x: 0, y: 0, fileName: null })
  }

  const handleRemoveFromMenu = (fileName) => {
    if (onRemoveFile) {
      onRemoveFile(fileName)
    } else {
      onDiscardChanges(fileName)
    }
    setContextMenu({ show: false, x: 0, y: 0, fileName: null })
  }

  const isNewFile = (fileName) => {
    const file = _fileStatus.find(f => f.file === fileName)
    if (!file) return false
    const { staged, working } = file.statusType
    return staged === 'A' || working === 'A' || staged === '?' || working === '?'
  }

  const handleStashFromMenu = (fileName) => {
    onStashFile(fileName)
    setContextMenu({ show: false, x: 0, y: 0, fileName: null })
  }

  const toggleFileSelection = (filePath) => {
    const newSelection = new Set(selectedFiles)
    if (selectedFiles.has(filePath)) {
      newSelection.delete(filePath)
    } else {
      newSelection.add(filePath)
    }
    setSelectedFiles(newSelection)
  }

  const handleFileItemClick = (file, isStaged) => {
    setActiveFile({ file, isStaged })
    onFileClick({ file, isStaged })
  }

  const handleStageAll = () => {
    const files = _fileStatus.filter((f) => !f.isStaged).map((f) => f.file)
    if (files.length > 0) {
      onStageFile(files)
    }
  }

  const handleUnstageAll = () => {
    const files = _fileStatus.filter((f) => f.isStaged).map((f) => f.file)
    if (files.length > 0) {
      onUnstageFile(files)
    }
  }

  const handleOpenInExplorer = () => {
    if (window.git && window.git.openInExplorer) {
      window.git.openInExplorer(repoPath)
    }
  }

  const parseDiff = (diffText) => {
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

  const diffLines = parseDiff(selectedFileDiff)
  const _fileStatus = fileStatus?.data?.files || []

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
        </div>
        <RefreshButton
          onClick={onRefresh}
          disabled={loading}
          title="Refresh status"
          text="Refresh"
        />
      </div>
      <div className={styles.fileStatusContainer}>
        <div
          className={styles.fileListPanel}
          style={{ width: `${listWidth}px`, flex: 'none', maxWidth: 'none' }}
        >
          <div className={styles.fileStatusSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <ChevronDown size={14} />
                <h3>Staging Area</h3>
                <span className={styles.fileCount}>
                  {_fileStatus.filter((f) => f.isStaged).length}
                </span>
              </div>
              {_fileStatus.some((f) => f.isStaged) && (
                <div className={styles.selectionActions}>
                  <button
                    onClick={handleUnstageAll}
                    className={styles.selectAllBtn}
                    disabled={loading}
                  >
                    Unstage All
                  </button>
                </div>
              )}
            </div>
            <div className={styles.fileList}>
              {_fileStatus
                .filter((file) => file.isStaged)
                .map((file, index) => (
                  <div
                    key={`staged-${index}`}
                    className={`${styles.fileItem} ${activeFile?.file === file.file && activeFile?.isStaged ? styles.active : ''}`}
                    onClick={(e) => {
                      if (e.target.closest('input')) return
                      handleFileItemClick(file.file, true)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, file.file)}
                  >
                    <div className={styles.checkboxWrapper}>
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => onUnstageFile(file.file)}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.fileCheckbox}
                      />
                    </div>
                    <span className={styles.fileIcon}>{getStatusIcon(file)}</span>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.file}</span>
                    </div>
                    <div className={styles.fileActions}>
                      <CustomTooltip title="Unstage file">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onUnstageFile(file.file)
                          }}
                          className={styles.unstageBtn}
                          disabled={loading}
                        >
                          <ArrowLeft size={14} />
                        </button>
                      </CustomTooltip>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className={styles.fileStatusSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <ChevronDown size={14} />
                <h3>Working Directory</h3>
                <span className={styles.fileCount}>
                  {_fileStatus.filter((f) => !f.isStaged).length}
                </span>
              </div>
              {_fileStatus.some((f) => !f.isStaged) && (
                <div className={styles.selectionActions}>
                  <button
                    onClick={handleStageAll}
                    className={styles.selectAllBtn}
                    disabled={loading}
                  >
                    Stage All
                  </button>
                </div>
              )}
            </div>
            <div className={styles.fileList}>
              {_fileStatus
                .filter((fileList) => !fileList.isStaged)
                .map((fileList, index) => (
                  <div
                    key={`working-${index}`}
                    className={`${styles.fileItem} ${activeFile?.file === fileList.file && !activeFile?.isStaged ? styles.active : ''}`}
                    onClick={(e) => {
                      if (e.target.closest('input') || e.target.closest('button')) return
                      handleFileItemClick(fileList.file, false)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, fileList.file)}
                  >
                    <div className={styles.checkboxWrapper}>
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => onStageFile(fileList.file)}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.fileCheckbox}
                      />
                    </div>
                    <span className={styles.fileIcon}>{getStatusIcon(fileList)}</span>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{fileList.file}</span>
                    </div>
                    <div className={styles.fileActions}>
                      <CustomTooltip title="Stage file">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onStageFile(fileList.file)
                          }}
                          className={styles.stageBtn}
                          disabled={loading}
                        >
                          <Plus size={14} />
                        </button>
                      </CustomTooltip>
                    </div>
                  </div>
                ))}
            </div>
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
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            top: contextMenu.y,
            left: contextMenu.x
          }}
        >
          <div className={styles.contextMenuHeader}>
            <span className={styles.contextMenuFileName}>{contextMenu.fileName}</span>
          </div>
          <div className={styles.contextMenuContent}>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleCopyFileName(contextMenu.fileName)}
            >
              <Copy size={14} />
              <span>Copy file name</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleCopyPath(contextMenu.fileName)}
            >
              <ExternalLink size={14} />
              <span>Copy full path</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleStashFromMenu(contextMenu.fileName)}
            >
              <Archive size={14} />
              <span>Stash changes</span>
            </button>
            <div className={styles.contextMenuDivider} />
            <button
              className={`${styles.contextMenuItem} ${styles.danger}`}
              onClick={() => isNewFile(contextMenu.fileName) ? handleRemoveFromMenu(contextMenu.fileName) : handleDiscardFromMenu(contextMenu.fileName)}
            >
              <Trash2 size={14} />
              <span>{isNewFile(contextMenu.fileName) ? 'Remove file' : 'Discard changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileStatus
