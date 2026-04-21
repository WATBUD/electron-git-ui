import React from 'react'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'
import {
  ArrowLeft,
  Plus
} from 'lucide-react'
import styles from './FileStatus.module.css'

export const FileItem = ({
  file,
  isActive,
  isSelected,
  onFileClick,
  onContextMenu,
  onStageFile,
  onUnstageFile,
  getStatusIcon,
  isStaged
}) => {
  const handleClick = (e) => {
    if (e.target.closest('input') || e.target.closest('button')) return
    onFileClick(file.file, isStaged, e)
  }

  const handleContextMenu = (e) => {
    onContextMenu(e, file.file, isStaged)
  }

  return (
    <div
      className={`${styles.fileItem} ${isActive ? styles.active : ''} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={styles.checkboxWrapper}>
        <input
          type="checkbox"
          checked={isStaged}
          onChange={() => isStaged ? onUnstageFile(file.file) : onStageFile(file.file)}
          onClick={(e) => e.stopPropagation()}
          className={styles.fileCheckbox}
        />
      </div>
      <span className={styles.fileIcon}>{getStatusIcon(file)}</span>
      <div className={styles.fileInfo}>
        <span className={styles.fileName}>{file.file}</span>
      </div>
      <div className={styles.fileActions}>
        {isStaged ? (
          <CustomTooltip title="Unstage file">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUnstageFile(file.file)
              }}
              className={styles.unstageBtn}
              disabled={false}
            >
              <ArrowLeft size={14} />
            </button>
          </CustomTooltip>
        ) : (
          <CustomTooltip title="Stage file">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStageFile(file.file)
              }}
              className={styles.stageBtn}
              disabled={false}
            >
              <Plus size={14} />
            </button>
          </CustomTooltip>
        )}
      </div>
    </div>
  )
}
