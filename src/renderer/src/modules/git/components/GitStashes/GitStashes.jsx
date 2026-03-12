import React, { useState } from 'react'
import styles from './GitStashes.module.css'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'
import {
  Archive,
  Trash2,
  Play,
  ArrowUpToLine,
  ChevronRight,
  Plus,
  Clock,
  Code2,
  AlertCircle
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
  const [expandedStash, setExpandedStash] = useState(null)

  const handlePush = async () => {
    await onPush(stashMessage.trim() || undefined)
    setStashMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePush()
    }
  }

  const handleDropConfirm = async (stashIndex) => {
    await onDrop(stashIndex)
    setConfirmDrop(null)
  }

  const toggleExpand = (stashIndex) => {
    const isExpanding = expandedStash !== stashIndex
    setExpandedStash(isExpanding ? stashIndex : null)
    if (isExpanding) {
      onSelectStash(stashIndex)
    }
  }

  const parseDiff = (diffText) => {
    if (!diffText) return []
    const lines = diffText.split('\n')
    const result = []
    let leftLine = 0,
      rightLine = 0

    lines.forEach((line) => {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
        if (match) {
          leftLine = parseInt(match[1])
          rightLine = parseInt(match[2])
          result.push({ type: 'hunk', content: line, leftLine: '...', rightLine: '...' })
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        result.push({ type: 'add', content: line, leftLine: '', rightLine: rightLine++ })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        result.push({ type: 'del', content: line, leftLine: leftLine++, rightLine: '' })
      } else if (line.startsWith(' ') || line === '') {
        result.push({
          type: 'context',
          content: line,
          leftLine: leftLine++,
          rightLine: rightLine++
        })
      } else {
        result.push({ type: 'info', content: line, leftLine: '', rightLine: '' })
      }
    })
    return result
  }

  const diffLines = parseDiff(selectedStashDiff)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Archive size={16} className={styles.headerIcon} />
          <h3>Stashed Changes</h3>
          {stashes.length > 0 && <span className={styles.badge}>{stashes.length}</span>}
        </div>
        <RefreshButton onClick={onRefresh} disabled={loading} text="Refresh" />
      </div>

      <div className={styles.createSection}>
        <div className={styles.createRow}>
          <div className={styles.inputWrapper}>
            <input
              className={styles.stashInput}
              type="text"
              placeholder="Give your stash a message..."
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <button
            className={styles.pushBtn}
            onClick={handlePush}
            disabled={loading || !stashMessage.trim()}
          >
            <Plus size={14} />
            <span>Stash</span>
          </button>
        </div>
      </div>

      <div className={styles.listWrapper}>
        {!loading && stashes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconContainer}>
              <Archive size={40} strokeWidth={1} />
            </div>
            <p>No stashed changes yet.</p>
          </div>
        ) : (
          <ul className={styles.stashList}>
            {stashes.map((stash) => {
              const isExpanded = expandedStash === stash.index
              const isConfirming = confirmDrop === stash.index

              return (
                <li
                  key={stash.index}
                  className={`${styles.stashItem} ${isExpanded ? styles.expanded : ''}`}
                >
                  <div className={styles.stashSummary} onClick={() => toggleExpand(stash.index)}>
                    <div className={styles.stashIndexBadge}>{stash.index}</div>
                    <div className={styles.stashMeta}>
                      <span className={styles.stashMessage}>{stash.message}</span>
                      <div className={styles.stashTime}>
                        <Clock size={10} />
                        <span>{stash.date}</span>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                    />
                  </div>

                  {isExpanded && (
                    <div className={styles.stashDetails}>
                      <div className={styles.actionToolbar}>
                        <CustomTooltip title="Apply - Keep this stash while applying changes">
                          <button
                            className={`${styles.actionBtn} ${styles.applyBtn}`}
                            onClick={() => onApply(stash.index)}
                            disabled={loading}
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Apply</span>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip title="Pop - Apply and delete this stash">
                          <button
                            className={`${styles.actionBtn} ${styles.popBtn}`}
                            onClick={() => onPop(stash.index)}
                            disabled={loading}
                          >
                            <ArrowUpToLine size={12} />
                            <span>Pop</span>
                          </button>
                        </CustomTooltip>

                        <div className={styles.spacer} />

                        {isConfirming ? (
                          <div className={styles.confirmRow}>
                            <AlertCircle size={12} className={styles.alertIcon} />
                            <span className={styles.confirmLabel}>Are you sure?</span>
                            <button
                              className={`${styles.confirmActionBtn} ${styles.dropBtnActive}`}
                              onClick={() => handleDropConfirm(stash.index)}
                              disabled={loading}
                            >
                              Delete
                            </button>
                            <button
                              className={styles.cancelBtn}
                              onClick={() => setConfirmDrop(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <CustomTooltip title="Drop - Permanently remove this stash">
                            <button
                              className={`${styles.actionBtn} ${styles.dropBtn}`}
                              onClick={() => setConfirmDrop(stash.index)}
                              disabled={loading}
                            >
                              <Trash2 size={12} />
                              <span>Drop</span>
                            </button>
                          </CustomTooltip>
                        )}
                      </div>

                      <div className={styles.embeddedDiff}>
                        <div className={styles.diffHeader}>
                          <Code2 size={12} />
                          <span>STASHED CONTENT</span>
                        </div>
                        <div className={styles.diffBody}>
                          {selectedStashDiff ? (
                            <div className={styles.diffLines}>
                              {diffLines.map((line, lidx) => (
                                <div
                                  key={lidx}
                                  className={`${styles.diffLine} ${styles[line.type]}`}
                                >
                                  <div className={styles.lineNumber}>{line.leftLine}</div>
                                  <div className={styles.lineNumber}>{line.rightLine}</div>
                                  <div className={styles.lineContent}>{line.content}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.diffLoading}>
                              <div className={styles.loadingSpinner} />
                              <span>Analyzing changes...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default GitStashes
