import React, { useState } from 'react'
import { LoadingModal } from '../../../../shared/components/LoadingModal'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import styles from './FileStatus.module.css'

export const FileStatus = ({
  fileStatus,
  onStageFile,
  onUnstageFile,
  onDiscardChanges,
  getStatusIcon,
  getStatusText,
  onRefresh,
  loading
}) => {
  const [selectedFiles, setSelectedFiles] = useState(new Set())

  const toggleFileSelection = (filePath) => {
    const newSelection = new Set(selectedFiles)
    if (selectedFiles.has(filePath)) {
      newSelection.delete(filePath)
    } else {
      newSelection.add(filePath)
    }
    setSelectedFiles(newSelection)
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
  const _fileStatus = fileStatus?.data?.files || []
  //  console.log('fileStatus:', _fileStatus);

  // if (!_fileStatus.length) {
  //   return null
  // }
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
      <div className={styles.fileStatusContent}>
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
                  className={`${styles.fileItem} ${selectedFiles.has(file.file) ? styles.selected : ''}`}
                  onClick={(e) => {
                    if (!e.target.closest('button, input')) {
                      toggleFileSelection(file.file)
                    }
                  }}
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
                  className={`${styles.fileItem} ${selectedFiles.has(fileList.file) ? styles.selected : ''}`}
                  onClick={(e) => {
                    if (!e.target.closest('button, input')) {
                      toggleFileSelection(fileList.file)
                    }
                  }}
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
    </div>
  )
}
