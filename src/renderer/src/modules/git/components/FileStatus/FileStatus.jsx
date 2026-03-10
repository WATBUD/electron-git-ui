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
  ChevronDown
} from 'lucide-react'

export const FileStatus = ({
  fileStatus,
  repoPath,
  selectedFileDiff,
  onFileClick,
  onStageFile,
  onUnstageFile,
  onDiscardChanges,
  getStatusIcon,
  getStatusText,
  onRefresh,
  loading
}) => {
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [activeFile, setActiveFile] = useState(null)
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    fileName: null
  })
  const contextMenuRef = React.useRef(null)

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

  const handleDiscardSelected = async () => {
    const filesToDiscard = Array.from(selectedFiles)
    try {
      await onDiscardChanges(filesToDiscard)
    } catch (error) {
      console.error('Error discarding changes:', error)
    } finally {
      setSelectedFiles(new Set())
    }
  }

  const handleSelectAll = (files) => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map((file) => file.file)))
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
        <div className={styles.fileListPanel}>
          <div className={styles.fileStatusSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <ChevronDown size={14} />
                <h3>Staging Area</h3>
              </div>
              {_fileStatus.some((f) => f.isStaged) && (
                <div className={styles.selectionActions}>
                  <button
                    onClick={() => handleSelectAll(_fileStatus.filter((f) => f.isStaged))}
                    className={styles.selectAllBtn}
                    disabled={loading}
                  >
                    {selectedFiles.size === _fileStatus.filter((f) => f.isStaged).length
                      ? 'Deselect'
                      : 'Select All'}
                  </button>
                  {selectedFiles.size > 0 && (
                    <button
                      onClick={handleDiscardSelected}
                      className={styles.deleteSelectedBtn}
                      disabled={loading}
                    >
                      Discard ({selectedFiles.size})
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className={styles.fileList}>
              {_fileStatus
                .filter((file) => file.isStaged)
                .map((file, index) => (
                  <div
                    key={`staged-${index}`}
                    className={`${styles.fileItem} ${selectedFiles.has(file.file) ? styles.selected : ''} ${activeFile?.file === file.file && activeFile?.isStaged ? styles.active : ''}`}
                    onClick={(e) => {
                      if (e.target.closest('input')) return
                      handleFileItemClick(file.file, true)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, file.file)}
                  >
                    <div className={styles.checkboxWrapper}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.file)}
                        onChange={() => toggleFileSelection(file.file)}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.fileCheckbox}
                      />
                    </div>
                    <span className={styles.fileIcon}>{getStatusIcon(file)}</span>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.file}</span>
                    </div>
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
                ))}
            </div>
          </div>
          <div className={styles.fileStatusSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <ChevronDown size={14} />
                <h3>Working Directory</h3>
              </div>
              {_fileStatus.some((f) => !f.isStaged) && (
                <div className={styles.selectionActions}>
                  <button
                    onClick={() => handleSelectAll(_fileStatus.filter((f) => !f.isStaged))}
                    className={styles.selectAllBtn}
                    disabled={loading}
                  >
                    {selectedFiles.size === _fileStatus.filter((f) => !f.isStaged).length
                      ? 'Deselect'
                      : 'Select All'}
                  </button>
                  {selectedFiles.size > 0 && (
                    <button
                      onClick={handleDiscardSelected}
                      className={styles.deleteSelectedBtn}
                      disabled={loading}
                    >
                      Discard ({selectedFiles.size})
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className={styles.fileList}>
              {_fileStatus
                .filter((fileList) => !fileList.isStaged)
                .map((fileList, index) => (
                  <div
                    key={`working-${index}`}
                    className={`${styles.fileItem} ${selectedFiles.has(fileList.file) ? styles.selected : ''} ${activeFile?.file === fileList.file && !activeFile?.isStaged ? styles.active : ''}`}
                    onClick={(e) => {
                      if (e.target.closest('input') || e.target.closest('button')) return
                      handleFileItemClick(fileList.file, false)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, fileList.file)}
                  >
                    <div className={styles.checkboxWrapper}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(fileList.file)}
                        onChange={() => toggleFileSelection(fileList.file)}
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
                      <CustomTooltip title="Discard changes">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDiscardChanges(fileList.file)
                          }}
                          className={styles.discardBtn}
                          disabled={loading}
                        >
                          <X size={14} />
                        </button>
                      </CustomTooltip>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default FileStatus
