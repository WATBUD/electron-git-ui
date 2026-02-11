import React, { useState } from 'react'
import { LoadingModal } from '../../../../shared/components/LoadingModal'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import './FileStatus.css'

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
    <div className="file-status-panel">
      <div className="file-status-header">
        <h3></h3>
        <RefreshButton
          onClick={onRefresh}
          disabled={loading}
          title="Refresh status"
          text="File Status Refresh"
        />
      </div>
      <div className="file-status-content">
        <div className="file-status-section">
          <div className="section-header">
            <h3>Staging Area</h3>
            {_fileStatus.some((f) => f.isStaged) && (
              <div className="selection-actions">
                <button
                  onClick={() => handleSelectAll(_fileStatus.filter((f) => f.isStaged))}
                  className="select-all-btn"
                  disabled={loading}
                >
                  {selectedFiles.size === _fileStatus.filter((f) => f.isStaged).length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                {selectedFiles.size > 0 && (
                  <button
                    onClick={handleDiscardSelected}
                    className="delete-selected-btn"
                    disabled={loading}
                    title="Discard selected changes"
                  >
                    Discard Selected ({selectedFiles.size})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="file-list">
            {_fileStatus
              .filter((file) => file.isStaged)
              .map((file, index) => (
                <div
                  key={`staged-${index}`}
                  className={`file-item ${selectedFiles.has(file.file) ? 'selected' : ''}`}
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
                    className="file-checkbox"
                  />
                  <span className="file-icon">{getStatusIcon(file)}</span>
                  <div className="file-info">
                    <span className="file-name">{file.file}</span>
                    <span className="file-status">{getStatusText(file)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUnstageFile(file.file)
                    }}
                    className="unstage-btn"
                    title="Unstage file"
                    disabled={loading}
                  >
                    ⬅
                  </button>
                </div>
              ))}
          </div>
        </div>
        <div className="file-status-section">
          <div className="section-header">
            <h3>Working Directory</h3>
            {_fileStatus.some((f) => !f.isStaged) && (
              <div className="selection-actions">
                <button
                  onClick={() => handleSelectAll(_fileStatus.filter((f) => !f.isStaged))}
                  className="select-all-btn"
                  disabled={loading}
                >
                  {selectedFiles.size === _fileStatus.filter((f) => !f.isStaged).length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
                {selectedFiles.size > 0 && (
                  <button
                    onClick={handleDiscardSelected}
                    className="delete-selected-btn"
                    disabled={loading}
                    title="Discard selected changes"
                  >
                    Discard Selected ({selectedFiles.size})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="file-list">
            {_fileStatus
              .filter((fileList) => !fileList.isStaged)
              .map((fileList, index) => (
                <div
                  key={`working-${index}`}
                  className={`file-item ${selectedFiles.has(fileList.file) ? 'selected' : ''}`}
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
                    className="file-checkbox"
                  />
                  <span className="file-icon">{getStatusIcon(fileList)}</span>
                  <div className="file-info">
                    <span className="file-name">{fileList.file}</span>
                    <span className="file-status">{getStatusText(fileList)}</span>
                  </div>
                  <div className="file-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStageFile(fileList.file)
                      }}
                      className="stage-btn"
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
                      className="discard-btn"
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
