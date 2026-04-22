import React, { useState, useMemo } from 'react'
import styles from './GitStashes.module.css'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'
import {
  Archive,
  Trash2,
  Play,
  ArrowUpToLine,
  Plus,
  Clock,
  Code2,
  AlertCircle,
  FileCode,
  Layout,
  ChevronDown
} from 'lucide-react'

export const GitStashes = ({
  stashes = [],
  loading = false,
  selectedStashDiff = null,
  onRefresh,
  onPush,
  onApply,
  onPop,
  onDrop,
  onSelectStash
}) => {
  const [stashMessage, setStashMessage] = useState('')
  const [confirmDrop, setConfirmDrop] = useState(null)
  const [selectedStashIndex, setSelectedStashIndex] = useState(null)
  const [collapsedFiles, setCollapsedFiles] = useState(new Set())

  const handlePush = async () => {
    if (!stashMessage.trim()) return
    await onPush(stashMessage.trim())
    setStashMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePush()
    }
  }

  const handleSelectStash = (index) => {
    setSelectedStashIndex(index)
    onSelectStash(index)
    setConfirmDrop(null)
  }

  const handleDropConfirm = async (stashIndex) => {
    await onDrop(stashIndex)
    setConfirmDrop(null)
    if (selectedStashIndex === stashIndex) {
      setSelectedStashIndex(null)
    }
  }

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
  const fileGroups = useMemo(() => {
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

  const selectedStash = useMemo(
    () => stashes.find((s) => s.index === selectedStashIndex),
    [stashes, selectedStashIndex]
  )

  return (
    <div className={styles.panel}>
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
                  </div>
                </div>

                <div className={styles.actionToolbar}>
                  <CustomTooltip title="Apply - Keep this stash while applying">
                    <button
                      className={`${styles.actionBtn} ${styles.applyBtn}`}
                      onClick={() => onApply(selectedStash.index)}
                      disabled={loading}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Apply</span>
                    </button>
                  </CustomTooltip>
                  <CustomTooltip title="Pop - Apply and delete this stash">
                    <button
                      className={`${styles.actionBtn} ${styles.popBtn}`}
                      onClick={() => onPop(selectedStash.index)}
                      disabled={loading}
                    >
                      <ArrowUpToLine size={12} />
                      <span>Pop</span>
                    </button>
                  </CustomTooltip>

                  {confirmDrop === selectedStash.index ? (
                    <div className={styles.confirmRow}>
                      <span className={styles.confirmLabel}>Delete?</span>
                      <button
                        className={styles.confirmActionBtn}
                        onClick={() => handleDropConfirm(selectedStash.index)}
                        disabled={loading}
                      >
                        OK
                      </button>
                      <button className={styles.cancelBtn} onClick={() => setConfirmDrop(null)}>
                        No
                      </button>
                    </div>
                  ) : (
                    <CustomTooltip title="Drop - Permanently remove">
                      <button
                        className={`${styles.actionBtn} ${styles.dropBtn}`}
                        onClick={() => setConfirmDrop(selectedStash.index)}
                        disabled={loading}
                      >
                        <Trash2 size={12} />
                      </button>
                    </CustomTooltip>
                  )}
                </div>
              </div>

              <div className={styles.diffScroller}>
                {loading && !selectedStashDiff ? (
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
    </div>
  )
}

export default GitStashes
