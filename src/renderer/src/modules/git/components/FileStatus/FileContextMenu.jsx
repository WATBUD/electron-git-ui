import React, { useRef, useEffect } from 'react'
import { message } from 'antd'
import {
  Copy,
  ExternalLink,
  Archive,
  Trash2
} from 'lucide-react'
import styles from './FileStatus.module.css'

export const FileContextMenu = ({
  show,
  x,
  y,
  fileName,
  isMultipleSelection,
  selectedCount,
  selectedFiles,
  onClose,
  onDiscardChanges,
  onRemoveFile,
  onStashFile,
  isNewFile
}) => {
  const contextMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleCopyFileName = () => {
    if (isMultipleSelection) {
      const selectedFilesList = selectedFiles.map(file => file.split('/').pop())
      navigator.clipboard.writeText(selectedFilesList.join('\n'))
      message.success(`${selectedFilesList.length} file names copied to clipboard`)
    } else {
      const fileNameOnly = fileName.split('/').pop()
      navigator.clipboard.writeText(fileNameOnly)
      message.success('File name copied to clipboard')
    }
    onClose()
  }

  const handleCopyPath = () => {
    if (isMultipleSelection) {
      navigator.clipboard.writeText(selectedFiles.join('\n'))
      message.success(`${selectedFiles.length} paths copied to clipboard`)
    } else {
      navigator.clipboard.writeText(fileName)
      message.success('Full path copied to clipboard')
    }
    onClose()
  }

  const handleStash = async () => {
    try {
      if (isMultipleSelection) {
        await onStashFile({ files: selectedFiles })
        message.success(`${selectedFiles.length} files stashed`)
      } else {
        await onStashFile(fileName)
        message.success('File stashed')
      }
      onClose()
    } catch (error) {
      message.error('Failed to stash file(s)')
      console.error('Stash error:', error)
    }
  }

  const handleDiscardOrRemove = async () => {
    try {
      if (isMultipleSelection) {
        const hasNewFiles = selectedFiles.some(file => isNewFile(file))
        
        if (hasNewFiles && onRemoveFile) {
          await onRemoveFile(selectedFiles)
          message.success(`${selectedFiles.length} files removed`)
        } else {
          await onDiscardChanges(selectedFiles)
          message.success(`${selectedFiles.length} files discarded`)
        }
      } else {
        if (isNewFile(fileName) && onRemoveFile) {
          await onRemoveFile(fileName)
          message.success('File removed')
        } else {
          await onDiscardChanges(fileName)
          message.success('File discarded')
        }
      }
      onClose()
    } catch (error) {
      message.error('Failed to discard/remove file(s)')
      console.error('Discard/Remove error:', error)
    }
  }

  if (!show) return null

  return (
    <div
      ref={contextMenuRef}
      className={styles.contextMenu}
      style={{
        top: y,
        left: x
      }}
    >
      <div className={styles.contextMenuHeader}>
        <span className={styles.contextMenuFileName}>
          {isMultipleSelection ? `${selectedCount} files selected` : fileName}
        </span>
      </div>
      <div className={styles.contextMenuContent}>
        <button className={styles.contextMenuItem} onClick={handleCopyFileName}>
          <Copy size={14} />
          <span>{isMultipleSelection ? 'Copy file names' : 'Copy file name'}</span>
        </button>
        <button className={styles.contextMenuItem} onClick={handleCopyPath}>
          <ExternalLink size={14} />
          <span>{isMultipleSelection ? 'Copy full paths' : 'Copy full path'}</span>
        </button>
        <button className={styles.contextMenuItem} onClick={handleStash}>
          <Archive size={14} />
          <span>Stash changes</span>
        </button>
        <div className={styles.contextMenuDivider} />
        <button className={`${styles.contextMenuItem} ${styles.danger}`} onClick={handleDiscardOrRemove}>
          <Trash2 size={14} />
          <span>
            {isMultipleSelection 
              ? 'Discard/Remove changes' 
              : (isNewFile(fileName) ? 'Remove file' : 'Discard changes')
            }
          </span>
        </button>
      </div>
    </div>
  )
}
