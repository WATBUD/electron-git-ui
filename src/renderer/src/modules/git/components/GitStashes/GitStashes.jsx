import React, { useState } from 'react'
import styles from './GitStashes.module.css'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'

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
      onSelectStash(stashIndex) // 展開時抓取 Diff
    }
  }

  // 渲染 Diff 的輔助函數 (參考 FileStatus)
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

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!loading && stashes.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>
            <span className={styles.headerIcon}>📦</span> Git Stashes
          </h3>
          <RefreshButton onClick={onRefresh} disabled={loading} text="Refresh" />
        </div>
        <div className={styles.createSection}>
          <div className={styles.createRow}>
            <input
              className={styles.stashInput}
              type="text"
              placeholder="Stash message..."
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className={styles.pushBtn} onClick={handlePush} disabled={loading}>
              Stash Changes
            </button>
          </div>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <p className={styles.emptyTitle}>No stashes yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          <span className={styles.headerIcon}>📦</span> Git Stashes
          <span className={styles.badge}>{stashes.length}</span>
        </h3>
        <RefreshButton onClick={onRefresh} disabled={loading} text="Refresh" />
      </div>

      <div className={styles.createSection}>
        <div className={styles.createRow}>
          <input
            className={styles.stashInput}
            type="text"
            placeholder="Stash message..."
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className={styles.pushBtn} onClick={handlePush} disabled={loading}>
            Stash
          </button>
        </div>
      </div>

      <div className={styles.listWrapper}>
        <ul className={styles.stashList}>
          {stashes.map((stash, idx) => {
            const isExpanded = expandedStash === stash.index
            const isConfirming = confirmDrop === stash.index

            return (
              <li
                key={stash.index}
                className={`${styles.stashItem} ${isExpanded ? styles.expanded : ''}`}
              >
                <div className={styles.stashSummary} onClick={() => toggleExpand(stash.index)}>
                  <span className={styles.stashBadge}>{stash.index}</span>
                  <div className={styles.stashMeta}>
                    <span className={styles.stashMessage}>{stash.message}</span>
                    <span className={styles.stashDate}>{stash.date}</span>
                  </div>
                  <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>
                    ›
                  </span>
                </div>

                {isExpanded && (
                  <div className={styles.stashActions}>
                    <div className={styles.actionBtns}>
                      <CustomTooltip title="git stash apply — 套用變更，但保留此 stash 記錄">
                        <button
                          className={`${styles.actionBtn} ${styles.applyBtn}`}
                          onClick={() => onApply(stash.index)}
                          disabled={loading}
                        >
                          ✅ Apply
                        </button>
                      </CustomTooltip>
                      <CustomTooltip title="git stash pop — 套用變更，並刪除此 stash 記錄">
                        <button
                          className={`${styles.actionBtn} ${styles.popBtn}`}
                          onClick={() => onPop(stash.index)}
                          disabled={loading}
                        >
                          ⬆️ Pop
                        </button>
                      </CustomTooltip>
                      {isConfirming ? (
                        <div className={styles.confirmRow}>
                          <span className={styles.confirmLabel}>確定刪除？</span>
                          <button
                            className={`${styles.actionBtn} ${styles.dropConfirmBtn}`}
                            onClick={() => handleDropConfirm(stash.index)}
                            disabled={loading}
                          >
                            確定
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.cancelBtn}`}
                            onClick={() => setConfirmDrop(null)}
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <CustomTooltip title="git stash drop — 直接刪除此 stash 記錄">
                          <button
                            className={`${styles.actionBtn} ${styles.dropBtn}`}
                            onClick={() => setConfirmDrop(stash.index)}
                            disabled={loading}
                          >
                            🗑️ Drop
                          </button>
                        </CustomTooltip>
                      )}
                    </div>

                    {/* 內嵌式 Diff 預覽 */}
                    <div className={styles.embeddedDiff}>
                      <div className={styles.diffTitle}>
                        📄 Stash Content Preview ({stash.index})
                      </div>
                      <div className={styles.diffBody}>
                        {selectedStashDiff ? (
                          <div className={styles.diffLines}>
                            {diffLines.map((line, lidx) => (
                              <div key={lidx} className={`${styles.diffLine} ${styles[line.type]}`}>
                                <div className={styles.lineNumber}>{line.leftLine}</div>
                                <div className={styles.lineNumber}>{line.rightLine}</div>
                                <div className={styles.lineContent}>{line.content}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.diffLoading}>Loading content diff...</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default GitStashes
