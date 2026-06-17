import React from 'react'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'
import {
  ArrowLeft,
  Plus
} from 'lucide-react'
import styles from './FileStatus.module.css'
import { PathMode } from './pathMode'

// 'short' returns the last two segments — parent dir + filename — so users
// see just enough context to disambiguate without the full tree. Files at
// the top level (≤1 segment) fall back to the filename.
const formatPath = (file, mode) => {
  if (mode === PathMode.FULL) return file
  if (mode === PathMode.SHORT) {
    const parts = file.split('/')
    if (parts.length <= 2) return file
    return parts.slice(-2).join('/')
  }
  return file.split('/').pop()
}

export const FileItem = React.memo(({
  file,
  isActive,
  isSelected,
  onFileClick,
  onContextMenu,
  onStageFile,
  onUnstageFile,
  getStatusIcon,
  isStaged,
  pathMode = PathMode.NAME
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
        <span className={styles.fileName} title={file.file}>
          {formatPath(file.file, pathMode)}
        </span>
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
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.file.file === nextProps.file.file &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isStaged === nextProps.isStaged &&
    prevProps.pathMode === nextProps.pathMode
  )
})
