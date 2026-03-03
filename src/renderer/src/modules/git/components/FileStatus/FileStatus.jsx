import React, { useState } from 'react'
import { LoadingModal } from '../../../../shared/components/LoadingModal'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import styles from './FileStatus.module.css'
import { message } from 'antd'

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
    // Create an array from the Set to maintain order
    const filesToDiscard = Array.from(selectedFiles)

    try {
      // Pass all files to discard at once
      await onDiscardChanges(filesToDiscard)
    } catch (error) {
      console.error('Error discarding changes:', error)
    } finally {
      // Always clear the selection
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
        // Headers or other info
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
          <h3></h3>
          <RefreshButton
            onClick={onRefresh}
            disabled={loading}
            title="Refresh status"
            text="File Status Refresh"
          />
        </div>
        <div className={styles.noChangesView}>
          <div className={styles.noChangesIcon}>📂</div>
          <p>No file changes detected.</p>
          <button onClick={handleOpenInExplorer} className={styles.openFolderBtn}>
            Open In Explorer / Finder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.fileStatusPanel}>
      <div className={styles.fileStatusHeader}>
        <h3></h3>
        <RefreshButton
          onClick={onRefresh}
          disabled={loading}
          title="Refresh status"
          text="File Status Refresh"
        />
      </div>
      <div className={styles.fileStatusContainer}>
        <div className={styles.fileListPanel}>
          <div className={styles.fileStatusSection}>
            <div className={styles.sectionHeader}>
              <h3>Staging Area</h3>
              {_fileStatus.some((f) => f.isStaged) && (
                <div className={styles.selectionActions}>
                  <button
                    onClick={() => handleSelectAll(_fileStatus.filter((f) => f.isStaged))}
                    className={styles.selectAllBtn}
                    disabled={loading}
                  >
                    {selectedFiles.size === _fileStatus.filter((f) => f.isStaged).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  {selectedFiles.size > 0 && (
                    <button
                      onClick={handleDiscardSelected}
                      className={styles.deleteSelectedBtn}
                      disabled={loading}
                      title="Discard selected changes"
                    >
                      Discard Selected ({selectedFiles.size})
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
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.file)}
                      onChange={() => toggleFileSelection(file.file)}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.fileCheckbox}
                    />
                    <span className={styles.fileIcon}>{getStatusIcon(file)}</span>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.file}</span>
                      <span className={styles.fileStatusText}>{getStatusText(file)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnstageFile(file.file)
                      }}
                      className={styles.unstageBtn}
                      title="Unstage file"
                      disabled={loading}
                    >
                      ⬅
                    </button>
                  </div>
                ))}
            </div>
          </div>
          <div className={styles.fileStatusSection}>
            <div className={styles.sectionHeader}>
              <h3>Working Directory</h3>
              {_fileStatus.some((f) => !f.isStaged) && (
                <div className={styles.selectionActions}>
                  <button
                    onClick={() => handleSelectAll(_fileStatus.filter((f) => !f.isStaged))}
                    className={styles.selectAllBtn}
                    disabled={loading}
                  >
                    {selectedFiles.size === _fileStatus.filter((f) => !f.isStaged).length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  {selectedFiles.size > 0 && (
                    <button
                      onClick={handleDiscardSelected}
                      className={styles.deleteSelectedBtn}
                      disabled={loading}
                      title="Discard selected changes"
                    >
                      Discard Selected ({selectedFiles.size})
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
                      if (e.target.closest('input')) return
                      handleFileItemClick(fileList.file, false)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, fileList.file)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(fileList.file)}
                      onChange={() => toggleFileSelection(fileList.file)}
                      onClick={(e) => e.stopPropagation()}
                      className={styles.fileCheckbox}
                    />
                    <span className={styles.fileIcon}>{getStatusIcon(fileList)}</span>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{fileList.file}</span>
                      <span className={styles.fileStatusText}>{getStatusText(fileList)}</span>
                    </div>
                    <div className={styles.fileActions}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStageFile(fileList.file)
                        }}
                        className={styles.stageBtn}
                        title="Stage file"
                        disabled={loading}
                      >
                        ➜
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDiscardChanges(fileList.file)
                        }}
                        className={styles.discardBtn}
                        title="Discard changes"
                        disabled={loading}
                      >
                        ×
                      </button>
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
                <h4>Diff: {activeFile.file}</h4>
                <span className={styles.diffType}>
                  {activeFile.isStaged ? 'Staged' : 'Working Tree'}
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
            <div className={styles.emptyDiff}>Select a file to view changes</div>
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
          <div className={styles.contextMenuHeader}>File: {contextMenu.fileName}</div>
          <div className={styles.contextMenuContent}>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleCopyFileName(contextMenu.fileName)}
            >
              Copy file name
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleCopyPath(contextMenu.fileName)}
            >
              Copy full path
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
