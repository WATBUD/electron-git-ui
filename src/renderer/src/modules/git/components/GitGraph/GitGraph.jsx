import React, { useState, useEffect, useRef } from 'react'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import styles from './GitGraph.module.css'
import { CopyButton } from '../../../../shared/components/CopyButton'
import { SearchInput } from '../../../../shared/components/SearchInput'

export const GitGraph = ({
  repoPath,
  commits,
  currentBranch,
  unpushedCount,
  onCheckout,
  onMerge,
  onRefresh
}) => {
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    targetCommit: null
  })
  const [searchTerm, setSearchTerm] = useState('')
  const contextMenuRef = useRef(null)

  const handleContextMenu = (e, commit) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      targetCommit: commit
    })
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ show: false, x: 0, y: 0, targetCommit: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch (err) {
      console.error('Error formatting date:', dateStr, err)
      return dateStr
    }
  }

  // 先排序，把有 HEAD 的 commit 放最上面
  const sortedCommits = React.useMemo(() => {
    if (!commits) return []
    return [...commits]
      .filter((commit) => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
          commit.hash.toLowerCase().includes(searchLower) ||
          commit.message.toLowerCase().includes(searchLower) ||
          commit.author.toLowerCase().includes(searchLower)
        )
      })
      .sort((a, b) => {
        const aHasHead = a.branches.some((branch) => branch.includes('HEAD'))
        const bHasHead = b.branches.some((branch) => branch.includes('HEAD'))
        if (aHasHead && !bHasHead) return -1
        if (!aHasHead && bHasHead) return 1
        return 0 // 其他保持原順序
      })
  }, [commits, searchTerm])

  return (
    <div className={styles.gitGraph}>
      <div className={styles.graphHeader}>
        <div className={styles.graphHeaderLeft}>
          <h3>
            {unpushedCount > 0 && (
              <span className={styles.unpushedBadge} title={`${unpushedCount} commits not pushed`}>
                {unpushedCount}
              </span>
            )}
          </h3>
          {currentBranch && <span className={styles.currentBranch}>{currentBranch}</span>}
        </div>
        <RefreshButton
          onClick={onRefresh}
          title="Refresh commit history"
          text="Commit History Refresh"
        />
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search commits by hash, message, or author..."
      />

      <div className={styles.commitList}>
        {sortedCommits.map((commit, index) => (
          <div
            key={commit.hash + index}
            className={`${styles.commitItem} ${commit.isCurrent ? styles.currentCommit : ''}`}
            onContextMenu={(e) => handleContextMenu(e, commit)}
          >
            <div className={styles.commitGraph}>
              {commit.branches.map((branch, i) => (
                <div
                  key={i}
                  className={`${styles.branchLine} ${branch === 'current' ? styles.current : ''}`}
                />
              ))}
              <div className={`${styles.commitNode} ${commit.isCurrent ? styles.current : ''}`} />
            </div>
            <div className={styles.commitInfo}>
              <div className={styles.commitHeader}>
                <div className={styles.commitHashContainer}>
                  <span className={styles.commitHash}>{commit.hash}</span>
                  <CopyButton
                    textToCopy={commit.hash}
                    title="Copy commit hash"
                    className="hash-style"
                  />
                  {/* HEAD 標籤放前面 */}
                  {commit.branches.some((b) => b.includes('HEAD')) && (
                    <div className={`${styles.branchTags} ${styles.headTags}`}>
                      {commit.branches
                        .filter((b) => b.includes('HEAD'))
                        .map((branch, i) => (
                          <span key={i} className={`${styles.branchTag} ${styles.head}`}>
                            {branch}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* 其他 branch tags */}
                  {commit.branches.filter((b) => !b.includes('HEAD')).length > 0 && (
                    <div className={styles.branchTags}>
                      {commit.branches
                        .filter((b) => !b.includes('HEAD'))
                        .map((branch, i) => (
                          <span
                            key={i}
                            className={`${styles.branchTag} ${branch.startsWith('origin/') ? styles.remote : ''}`}
                          >
                            {branch}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {commit.isCurrent && <span className={styles.currentTag}>Current</span>}
                {commit.isUnpushed && <span className={styles.unpushedTag}>Unpushed</span>}
              </div>

              <div className={styles.commitMessage}>{commit.message}</div>
              <div className={styles.commitMeta}>
                <span className={styles.commitAuthor}>{commit.author}</span>
                <span className={styles.commitDate}>{formatDate(commit.date)}</span>
                <button
                  onClick={() => onCheckout(commit.hash)}
                  className={styles.checkoutBtn}
                  disabled={commit.isCurrent}
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x
          }}
        >
          <div className={styles.contextMenuHeader}>
            Merge {contextMenu.targetCommit?.branches[0] || 'branch'} into {currentBranch}
          </div>
          <div className={styles.contextMenuContent}>
            <button
              onClick={() => {
                onMerge(contextMenu.targetCommit?.branches[0])
                setContextMenu({ show: false, x: 0, y: 0, targetCommit: null })
              }}
              disabled={
                !contextMenu.targetCommit?.branches[0] ||
                contextMenu.targetCommit?.branches[0] === currentBranch
              }
            >
              Merge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
