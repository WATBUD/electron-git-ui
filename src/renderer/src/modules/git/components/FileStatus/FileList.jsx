import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, FileText, FolderOpen } from 'lucide-react'
import { FileItem } from './FileItem'
import styles from './FileStatus.module.css'

// Virtual scrolling component for large file lists
const VirtualFileList = ({ 
  files, 
  isStaged, 
  activeFile, 
  selectedFiles, 
  onFileClick, 
  onContextMenu, 
  onStageFile, 
  onUnstageFile, 
  getStatusIcon, 
  showFullPath 
}) => {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const containerRef = useRef(null)
  
  const itemHeight = 32 // Height of each file item in pixels
  const overscan = 5 // Number of items to render outside visible area
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    files.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )
  
  const visibleFiles = files.slice(startIndex, endIndex)
  const totalHeight = files.length * itemHeight
  const offsetY = startIndex * itemHeight
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])
  
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])
  
  return (
    <div 
      ref={containerRef}
      className={styles.fileList}
      onScroll={handleScroll}
      style={{ 
        position: 'relative', 
        overflow: 'auto',
        scrollBehavior: 'smooth'
      }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleFiles.map((file, index) => {
            const actualIndex = startIndex + index
            const isActive = activeFile?.file === file.file && activeFile?.isStaged === isStaged
            const isSelected = selectedFiles.has(`${file.file}-${isStaged}`)
            
            return (
              <FileItem
                key={`${isStaged ? 'staged' : 'working'}-${actualIndex}`}
                file={file}
                isActive={isActive}
                isSelected={isSelected}
                isStaged={isStaged}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                onStageFile={onStageFile}
                onUnstageFile={onUnstageFile}
                getStatusIcon={getStatusIcon}
                showFullPath={showFullPath}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

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
  const [showFullPath, setShowFullPath] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Use virtual scrolling for large lists
  const useVirtualScrolling = files.length > 100

  const handleHeaderClick = () => {
    if (hasFiles) {
      setIsCollapsed(!isCollapsed)
    }
  }

  // Force collapsed when no files
  const effectiveCollapsed = !hasFiles || isCollapsed

  return (
    <div className={`${styles.fileStatusSection} ${effectiveCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sectionHeader}>
        <div 
          className={styles.sectionTitle}
          onClick={handleHeaderClick}
          style={{ cursor: hasFiles ? 'pointer' : 'default' }}
        >
          <ChevronDown 
            size={14} 
            className={`${styles.chevronIcon} ${effectiveCollapsed ? styles.collapsed : ''}`}
            style={{ opacity: hasFiles ? 1 : 0.3 }}
          />
          <h3>{title}</h3>
          <span className={styles.fileCount}>
            {files.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowFullPath(!showFullPath)
            }}
            className={styles.pathToggleBtn}
            title={showFullPath ? "Show file names only" : "Show full paths"}
            disabled={!hasFiles}
            style={{ opacity: hasFiles ? 1 : 0.3 }}
          >
            {showFullPath ? <FileText size={14} /> : <FolderOpen size={14} />}
          </button>
        </div>
        {hasFiles && !effectiveCollapsed && (
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
      {!effectiveCollapsed && (
        useVirtualScrolling ? (
          <VirtualFileList
            files={files}
            isStaged={isStaged}
            activeFile={activeFile}
            selectedFiles={selectedFiles}
            onFileClick={onFileClick}
            onContextMenu={onContextMenu}
            onStageFile={onStageFile}
            onUnstageFile={onUnstageFile}
            getStatusIcon={getStatusIcon}
            showFullPath={showFullPath}
          />
        ) : (
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
                  showFullPath={showFullPath}
                />
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
