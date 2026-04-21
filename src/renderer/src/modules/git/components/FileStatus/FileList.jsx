import React from 'react'
import { ChevronDown } from 'lucide-react'
import { FileItem } from './FileItem'
import styles from './FileStatus.module.css'

export const FileList = ({
  title,
  files,
  isStaged,
  activeFile,
  selectedFiles,
  onFileClick,
  onContextMenu,
  onStageFile,
  onUnstageFile,
  getStatusIcon,
  onStageAll,
  onUnstageAll,
  loading
}) => {
  const hasFiles = files.length > 0

  return (
    <div className={styles.fileStatusSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <ChevronDown size={14} />
          <h3>{title}</h3>
          <span className={styles.fileCount}>
            {files.length}
          </span>
        </div>
        {hasFiles && (
          <div className={styles.selectionActions}>
            {isStaged ? (
              <button
                onClick={onUnstageAll}
                className={styles.selectAllBtn}
                disabled={loading}
              >
                Unstage All
              </button>
            ) : (
              <button
                onClick={onStageAll}
                className={styles.selectAllBtn}
                disabled={loading}
              >
                Stage All
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.fileList}>
        {files.map((file, index) => {
          const isActive = activeFile?.file === file.file && activeFile?.isStaged === isStaged
          const isSelected = selectedFiles.has(`${file.file}-${isStaged}`)
          
          return (
            <FileItem
              key={`${isStaged ? 'staged' : 'working'}-${index}`}
              file={file}
              isActive={isActive}
              isSelected={isSelected}
              isStaged={isStaged}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              onStageFile={onStageFile}
              onUnstageFile={onUnstageFile}
              getStatusIcon={getStatusIcon}
            />
          )
        })}
      </div>
    </div>
  )
}
