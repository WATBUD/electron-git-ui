import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import styles from './GitStashes.module.css'
import { StashContextMenu } from './StashContextMenu'
import {
  Archive,
  Clock,
  Code2,
  FileCode,
  Layout,
  ChevronDown
} from 'lucide-react'

export const GitStashes = ({
  stashes = [],
  loading = false,
  selectedStashDiff = null,
  onApply,
  onPop,
  onDrop,
  onRename,
  onSelectStash
}) => {
  const [selectedStashIndex, setSelectedStashIndex] = useState(null)
  const [collapsedFiles, setCollapsedFiles] = useState(new Set())
  const [renamingStash, setRenamingStash] = useState(null)
  const [newStashMessage, setNewStashMessage] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [dropConfirm, setDropConfirm] = useState(null)
  const contextMenuRef = useRef(null)

  const handleSelectStash = (index) => {
    setSelectedStashIndex(index)
    onSelectStash(index)
  }

  const handleDropConfirm = async () => {
    if (!dropConfirm) return
    const { stashIndex } = dropConfirm
    await onDrop(stashIndex)
    setDropConfirm(null)
    if (selectedStashIndex === stashIndex) {
      setSelectedStashIndex(null)
    }
  }

  const handleRename = async () => {
    if (!newStashMessage.trim() || !renamingStash) return
    await onRename(renamingStash, newStashMessage.trim())
    setShowRenameModal(false)
    setRenamingStash(null)
    setNewStashMessage('')
  }

  const handleCancelRename = () => {
    setShowRenameModal(false)
    setRenamingStash(null)
    setNewStashMessage('')
  }

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleRename()
    } else if (e.key === 'Escape') {
      setRenamingStash(null)
      setNewStashMessage('')
    }
  }

  // Opens the context menu via ref so GitStashes itself doesn't re-render
  // when the menu opens (matters when the stash list is long).
  const handleContextMenu = useCallback((e, stashIndex, stashMessage) => {
    e.preventDefault()
    e.stopPropagation()
    contextMenuRef.current?.open({
      x: e.clientX,
      y: e.clientY,
      stashIndex,
      stashMessage
    })
  }, [])

  const handleContextMenuRename = useCallback((stashIndex, stashMessage) => {
    setRenamingStash(stashIndex)
    setNewStashMessage(stashMessage)
    setShowRenameModal(true)
  }, [])

  const handleContextMenuApply = useCallback(
    (stashIndex) => {
      onApply?.(stashIndex)
    },
    [onApply]
  )

  const handleContextMenuPop = useCallback(
    (stashIndex) => {
      onPop?.(stashIndex)
    },
    [onPop]
  )

  const handleContextMenuDrop = useCallback((stashIndex, stashMessage) => {
    setDropConfirm({ stashIndex, stashMessage })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    contextMenuRef.current?.close()
  }, [])

  const toggleFileCollapse = (fileName) => {
    setCollapsedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileName)) {
        newSet.delete(fileName)
      } else {
        newSet.add(fileName)
      }
      return newSet
    })
  }

  // Parse diff into file groups
  const parsedFileGroups = useMemo(() => {
    if (!selectedStashDiff) return []

    const lines = selectedStashDiff.split('\n')
    const files = []
    let currentFile = null
    let leftLine = 0,
      rightLine = 0

    lines.forEach((line) => {
      // Improved regex to handle filenames with spaces and avoid matching 'a/' part
      if (line.startsWith('diff --git')) {
        const bPartMatch = line.match(/\s+b\/(.+)$/)
        const fileName = bPartMatch ? bPartMatch[1] : 'Unknown File'

        currentFile = {
          fileName,
          lines: [],
          status: 'Modified'
        }
        files.push(currentFile)
      } else if (currentFile) {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
          if (match) {
            leftLine = parseInt(match[1])
            rightLine = parseInt(match[2])
            currentFile.lines.push({
              type: 'hunk',
              content: line,
              leftLine: '...',
              rightLine: '...'
            })
          }
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          currentFile.lines.push({
            type: 'add',
            content: line,
            leftLine: '',
            rightLine: rightLine++
          })
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentFile.lines.push({
            type: 'del',
            content: line,
            leftLine: leftLine++,
            rightLine: ''
          })
        } else {
          // Keep context lines (starting with space) and metadata
          currentFile.lines.push({
            type: line.startsWith(' ') ? 'context' : 'info',
            content: line,
            leftLine: line.startsWith(' ') ? leftLine++ : '',
            rightLine: line.startsWith(' ') ? rightLine++ : ''
          })
        }
      }
    })

    return files
  }, [selectedStashDiff])

  // Cache last successful parse per stash, so apply/pop/rename reloads that
  // briefly empty selectedStashDiff don't flash "No diff content available".
  const cachedFileGroupsRef = useRef({ index: null, groups: [] })

  useEffect(() => {
    if (parsedFileGroups.length > 0 && selectedStashIndex !== null) {
      cachedFileGroupsRef.current = {
        index: selectedStashIndex,
        groups: parsedFileGroups
      }
    }
  }, [parsedFileGroups, selectedStashIndex])

  const fileGroups =
    parsedFileGroups.length > 0
      ? parsedFileGroups
      : cachedFileGroupsRef.current.index === selectedStashIndex
        ? cachedFileGroupsRef.current.groups
        : []

  const selectedStash = useMemo(
    () => stashes.find((s) => s.index === selectedStashIndex),
    [stashes, selectedStashIndex]
  )

  return (
    <div className={styles.panel} onClick={handleCloseContextMenu}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Archive size={16} className={styles.headerIcon} />
          <h3>Stashed Changes</h3>
          {stashes.length > 0 && <span className={styles.badge}>{stashes.length}</span>}
        </div>
      </div>

      <div className={styles.container}>
        {/* Left Sidebar: Stash List */}
        <div className={styles.sidebar}>

          <div className={styles.listWrapper}>
            {stashes.length === 0 ? (
              <div className={styles.emptyState}>
                <Archive size={40} strokeWidth={1} style={{ opacity: 0.2 }} />
                <p>No stashes found</p>
              </div>
            ) : (
              <ul className={styles.stashList}>
                {stashes.map((stash) => (
                  <li
                    key={stash.index}
                    className={`${styles.stashItem} ${selectedStashIndex === stash.index ? styles.active : ''}`}
                    onClick={() => handleSelectStash(stash.index)}
                    onContextMenu={(e) => handleContextMenu(e, stash.index, stash.message)}
                  >
                    <div className={styles.stashSummary}>
                      <div className={styles.stashIndexBadge}>
                        {stash.index.replace('stash@{', '').replace('}', '')}
                      </div>
                      <div className={styles.stashMeta}>
                        <span className={styles.stashMessage}>{stash.message}</span>
                        <div className={styles.stashTime}>
                          <Clock size={10} />
                          <span>{stash.date}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Detail: Selected Stash Info & Diff */}
        <div className={styles.detailView}>
          {selectedStash ? (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailMeta}>
                  <div className={styles.detailTitleRow}>
                    <span className={styles.detailTitle}>{selectedStash.message}</span>
                    {fileGroups.length > 0 && (
                      <span className={styles.fileCountBadge}>{fileGroups.length} files</span>
                    )}
                  </div>
                  <div className={styles.detailSubtitle}>
                    <Clock size={12} />
                    <span>{selectedStash.date}</span>
                    <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
                    <span>{selectedStash.hash.substring(0, 7)}</span>
                    <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
                    <span style={{ opacity: 0.5 }}>Right-click for actions</span>
                  </div>
                </div>
              </div>

              <div className={styles.diffScroller}>
                {loading && !selectedStashDiff && fileGroups.length === 0 ? (
                  <div className={styles.diffLoading}>
                    <div className={styles.loadingSpinner} />
                    <span>Loading context...</span>
                  </div>
                ) : fileGroups.length > 0 ? (
                  fileGroups.map((file, fidx) => (
                    <div key={fidx} className={styles.fileBlock}>
                      <div 
                        className={styles.fileHeader}
                        onClick={() => toggleFileCollapse(file.fileName)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={styles.fileName}>
                          <ChevronDown 
                            size={14} 
                            className={`${styles.chevron} ${collapsedFiles.has(file.fileName) ? styles.chevronCollapsed : ''}`}
                          />
                          <FileCode size={14} className={styles.fileIcon} />
                          <span>{file.fileName}</span>
                        </div>
                        <span className={styles.fileStatusBadge}>{file.status}</span>
                      </div>
                      <div className={`${styles.diffBody} ${collapsedFiles.has(file.fileName) ? styles.collapsed : ''}`}>
                        <div className={styles.diffLines}>
                          {file.lines.map((line, lidx) => (
                            <div key={lidx} className={`${styles.diffLine} ${styles[line.type]}`}>
                              <div className={styles.lineNumber}>{line.leftLine}</div>
                              <div className={styles.lineNumber}>{line.rightLine}</div>
                              <div className={styles.lineContent}>{line.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.diffLoading}>
                    <Code2 size={40} style={{ opacity: 0.1, marginBottom: 8 }} />
                    <span>No diff content available</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <Layout size={48} strokeWidth={1} style={{ opacity: 0.1, marginBottom: 16 }} />
              <p>Select a stash from the list to view its contents</p>
            </div>
          )}
        </div>
      </div>

      <StashContextMenu
        ref={contextMenuRef}
        onApply={handleContextMenuApply}
        onPop={handleContextMenuPop}
        onRename={handleContextMenuRename}
        onDrop={handleContextMenuDrop}
      />

      {dropConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDropConfirm(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Drop Stash</h3>
            <div className={styles.modalContent}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                Permanently delete this stash?
              </p>
              <p
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  wordBreak: 'break-word'
                }}
              >
                {dropConfirm.stashMessage}
              </p>
            </div>
            <div className={styles.modalButtons}>
              <button onClick={() => setDropConfirm(null)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleDropConfirm}
                disabled={loading}
                className={styles.confirmBtn}
                style={{ background: '#ff3b30', borderColor: '#ff3b30' }}
              >
                Drop
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className={styles.modalOverlay} onClick={handleCancelRename}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Rename Stash</h3>
            <div className={styles.modalContent}>
              <input
                type="text"
                value={newStashMessage}
                onChange={(e) => setNewStashMessage(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                placeholder="Enter new message..."
                className={styles.modalInput}
                autoFocus
              />
            </div>
            <div className={styles.modalButtons}>
              <button onClick={handleCancelRename} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={loading || !newStashMessage.trim()}
                className={styles.confirmBtn}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GitStashes
