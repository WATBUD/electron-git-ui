import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, FileText, FolderOpen, Folder } from 'lucide-react'
import { FileItem } from './FileItem'
import styles from './FileStatus.module.css'
import { PathMode } from './pathMode'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'

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
  pathMode
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

  // Keep the active item visible. The target row may be outside the rendered
  // window, so scroll by its computed offset (index * itemHeight) rather than
  // by a DOM element, then only adjust if it's actually off-screen.
  useEffect(() => {
    if (!activeFile || activeFile.isStaged !== isStaged) return
    const idx = files.findIndex((f) => f.file === activeFile.file)
    const container = containerRef.current
    if (idx === -1 || !container) return

    const itemTop = idx * itemHeight
    const itemBottom = itemTop + itemHeight
    if (itemTop < container.scrollTop) {
      container.scrollTop = itemTop
    } else if (itemBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = itemBottom - container.clientHeight
    }
  }, [activeFile, files, isStaged])

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
                pathMode={pathMode}
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
  // Each toggle button flips between its mode and PathMode.NAME, so users
  // can pick either short or full without cycling through the other.
  const [pathMode, setPathMode] = useState(PathMode.NAME)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const listRef = useRef(null)

  // Use virtual scrolling for large lists
  const useVirtualScrolling = files.length > 100

  // Keep the active item visible when navigating with the keyboard. The
  // non-virtual list renders every row, so scroll the matching child element
  // into view (only when it's off-screen) without disturbing the page.
  useEffect(() => {
    if (useVirtualScrolling) return
    if (!activeFile || activeFile.isStaged !== isStaged) return
    const idx = files.findIndex((f) => f.file === activeFile.file)
    const container = listRef.current
    if (idx === -1 || !container) return
    const el = container.children[idx]
    if (!el) return

    const cRect = container.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    if (eRect.top < cRect.top) {
      container.scrollTop -= cRect.top - eRect.top
    } else if (eRect.bottom > cRect.bottom) {
      container.scrollTop += eRect.bottom - cRect.bottom
    }
  }, [activeFile, files, isStaged, useVirtualScrolling])

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
          <span className={styles.fileCount}>{files.length}</span>
          <CustomTooltip
            title={
              pathMode === PathMode.SHORT
                ? 'Show file names only'
                : 'Show parent folder + filename'
            }
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPathMode((m) => (m === PathMode.SHORT ? PathMode.NAME : PathMode.SHORT))
              }}
              className={`${styles.pathToggleBtn} ${pathMode === PathMode.SHORT ? styles.pathToggleBtnActive : ''}`}
              disabled={!hasFiles}
              style={{ opacity: hasFiles ? 1 : 0.3 }}
            >
              <Folder size={14} />
            </button>
          </CustomTooltip>
          <CustomTooltip
            title={pathMode === PathMode.FULL ? 'Show file names only' : 'Show full paths'}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPathMode((m) => (m === PathMode.FULL ? PathMode.NAME : PathMode.FULL))
              }}
              className={`${styles.pathToggleBtn} ${pathMode === PathMode.FULL ? styles.pathToggleBtnActive : ''}`}
              disabled={!hasFiles}
              style={{ opacity: hasFiles ? 1 : 0.3 }}
            >
              {pathMode === PathMode.FULL ? <FileText size={14} /> : <FolderOpen size={14} />}
            </button>
          </CustomTooltip>
        </div>
        {hasFiles && !effectiveCollapsed && (
          <div className={styles.selectionActions}>
            {isStaged ? (
              <button onClick={onUnstageAll} className={styles.selectAllBtn} disabled={loading}>
                Unstage All
              </button>
            ) : (
              <button onClick={onStageAll} className={styles.selectAllBtn} disabled={loading}>
                Stage All
              </button>
            )}
          </div>
        )}
      </div>
      {!effectiveCollapsed &&
        (useVirtualScrolling ? (
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
            pathMode={pathMode}
          />
        ) : (
          <div className={styles.fileList} ref={listRef}>
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
                  pathMode={pathMode}
                />
              )
            })}
          </div>
        ))}
    </div>
  )
}
