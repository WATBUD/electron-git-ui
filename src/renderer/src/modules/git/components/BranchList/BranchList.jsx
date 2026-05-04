import React, { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  GitBranch,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2
} from 'lucide-react'
import { CopyButton } from '../../../../shared/components/CopyButton'
import { SearchInput } from '../../../../shared/components/SearchInput'
import { BranchContextMenu } from './BranchContextMenu'
import styles from './BranchList.module.css'

// Constants
const BRANCH_COMMITS_LIMIT = 50

const BranchList = ({
  branches = [],
  remoteBranches = [],
  currentBranch,
  loading,
  onCheckout,
  onCheckoutCommit,
  onDelete,
  onDeleteRemote,
  onMerge,
  newBranchName,
  setNewBranchName,
  createBranchByNewBranchName,
  selectedPrefixes = [],
  onRename,
  onCreateTag,
  localOnlyTags = [],
  onDeleteTag,
  onRequestDeleteTag,
  onRequestDeleteBranch,
  onPushTag
}) => {
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: null,
    target: null,
    tags: []
  })
  const [renameBranchState, setRenameBranchState] = useState({
    show: false,
    oldName: '',
    newName: ''
  })
  const [createTagState, setCreateTagState] = useState({
    show: false,
    branchName: '',
    tagName: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [isRemoteBranchesCollapsed, setIsRemoteBranchesCollapsed] = useState(false)
  const [isLocalBranchesCollapsed, setIsLocalBranchesCollapsed] = useState(false)
  const [expandedBranches, setExpandedBranches] = useState(new Set())
  const [branchCommits, setBranchCommits] = useState({})
  const [loadingCommits, setLoadingCommits] = useState(false)

  // Memoized branch prefix
  const branchPrefix = useMemo(() => selectedPrefixes.join(','), [selectedPrefixes])

  // Handle context menu
  const handleContextMenu = useCallback((e, type, target) => {
    e.preventDefault()
    
    let tags = []
    if (type === 'branch') {
      const branchObj = branches.find(b => (typeof b === 'string' ? b : b.name) === target)
      tags = branchObj?.tags || []
    } else if (type === 'commit') {
      tags = target?.tags || []
    }
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type,
      target,
      tags
    })
  }, [branches])

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0, type: null, target: null, tags: [] })
  }, [])

  // Sort and filter branches
  const sortBranches = useCallback((branchesList) => {
    return [...branchesList]
      .filter((branch) => {
        const name = typeof branch === 'string' ? branch : branch.name
        const matchesBranchName = searchTerm === '' || name.toLowerCase().includes(searchTerm.toLowerCase())
        
        if (tagSearchTerm) {
          const branchObj = typeof branch === 'string' 
            ? branches.find(b => (typeof b === 'string' ? b : b.name) === name)
            : branch
          const tags = branchObj?.tags || []
          const branchHasTag = tags.some(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
          const commits = branchCommits[name] || []
          const commitsHaveTag = commits.some(commit => 
            commit.tags.some(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
          )
          
          return matchesBranchName && (branchHasTag || commitsHaveTag)
        }
        
        return matchesBranchName
      })
      .sort((a, b) => {
        const nameA = typeof a === 'string' ? a : a.name
        const nameB = typeof b === 'string' ? b : b.name
        if (nameB === currentBranch) return 1
        if (nameA === currentBranch) return -1
        return nameA.localeCompare(nameB)
      })
  }, [searchTerm, tagSearchTerm, branches, branchCommits, currentBranch])

  // Filter commits by tag
  const filterCommitsByTag = useCallback((commits) => {
    if (!tagSearchTerm) return commits
    return commits.filter(commit => 
      commit.tags.some(tag => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
    )
  }, [tagSearchTerm])

  // Memoized sorted branches
  const sortedLocalBranches = useMemo(() => sortBranches(branches), [sortBranches, branches])
  const sortedRemoteBranches = useMemo(() => sortBranches(remoteBranches), [sortBranches, remoteBranches])

  // Auto-load commits for all branches when tag search is active
  React.useEffect(() => {
    if (!tagSearchTerm || branches.length === 0) {
      setLoadingCommits(false)
      return
    }

    const loadAllCommits = async () => {
      setLoadingCommits(true)
      
      const loadPromises = branches.map(async (branchObj) => {
        const branchName = typeof branchObj === 'string' ? branchObj : branchObj.name
        if (branchCommits[branchName]) return null
        
        try {
          const result = await window.git.getBranchCommits(branchName, BRANCH_COMMITS_LIMIT)
          return result.success ? { branchName, commits: result.data } : null
        } catch (err) {
          console.error('Error loading branch commits:', err)
          return null
        }
      })

      const results = await Promise.all(loadPromises)
      const newCommits = results.reduce((acc, result) => {
        if (result) acc[result.branchName] = result.commits
        return acc
      }, {})

      if (Object.keys(newCommits).length > 0) {
        setBranchCommits(prev => ({ ...prev, ...newCommits }))
      }
      
      setLoadingCommits(false)
    }

    loadAllCommits()
  }, [tagSearchTerm, branches.length, branchCommits])

  // Handle create branch
  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return

    const branchNames = branchPrefix
      ? branchPrefix.split(',').map((p) => `${p.trim()}${newBranchName}`).join(',')
      : newBranchName
    createBranchByNewBranchName(branchNames)
  }, [newBranchName, branchPrefix, createBranchByNewBranchName])

  // Handle rename branch
  const handleRenameBranch = useCallback((oldName) => {
    setRenameBranchState({ show: true, oldName, newName: oldName })
    closeContextMenu()
  }, [closeContextMenu])

  // Handle create tag
  const handleCreateTag = useCallback((branchName) => {
    setCreateTagState({ show: true, branchName, tagName: '' })
    closeContextMenu()
  }, [closeContextMenu])

  // Submit create tag
  const submitCreateTag = useCallback(async () => {
    if (!createTagState.tagName?.trim() || !onCreateTag) {
      setCreateTagState({ show: false, branchName: '', tagName: '' })
      return
    }

    await onCreateTag(createTagState.tagName, createTagState.branchName)
    
    // Refresh commits for all expanded branches
    expandedBranches.forEach(branchName => {
      window.git.getBranchCommits(branchName, BRANCH_COMMITS_LIMIT)
        .then(result => {
          if (result.success) {
            setBranchCommits(prev => ({ ...prev, [branchName]: result.data }))
          }
        })
        .catch(err => console.error('Error refreshing branch commits:', err))
    })
    
    setCreateTagState({ show: false, branchName: '', tagName: '' })
  }, [createTagState, onCreateTag, expandedBranches])

  // Submit rename
  const submitRename = useCallback(() => {
    if (renameBranchState.newName && renameBranchState.newName !== renameBranchState.oldName) {
      onRename(renameBranchState.oldName, renameBranchState.newName)
    }
    setRenameBranchState({ show: false, oldName: '', newName: '' })
  }, [renameBranchState, onRename])

  // Handle branch click
  const handleBranchClick = useCallback(async (branchName) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(branchName)) {
        newSet.delete(branchName)
      } else {
        newSet.add(branchName)
      }
      return newSet
    })
    
    if (!branchCommits[branchName]) {
      try {
        const result = await window.git.getBranchCommits(branchName, BRANCH_COMMITS_LIMIT)
        if (result.success) {
          setBranchCommits(prev => ({ ...prev, [branchName]: result.data }))
        }
      } catch (err) {
        console.error('Error loading branch commits:', err)
      }
    }
  }, [branchCommits])

  // Handle refresh commits
  const handleRefreshCommits = useCallback(() => {
    // Refresh all expanded branches commits
    expandedBranches.forEach(branchName => {
      window.git.getBranchCommits(branchName, BRANCH_COMMITS_LIMIT)
        .then(result => {
          if (result.success) {
            setBranchCommits(prev => ({ ...prev, [branchName]: result.data }))
          }
        })
        .catch(err => console.error('Error refreshing branch commits:', err))
    })
    
    // Refresh tag search commits
    if (tagSearchTerm && branches.length > 0) {
      const loadPromises = branches.map(async (branchObj) => {
        const branchName = typeof branchObj === 'string' ? branchObj : branchObj.name
        try {
          const result = await window.git.getBranchCommits(branchName, BRANCH_COMMITS_LIMIT)
          return result.success ? { branchName, commits: result.data } : null
        } catch (err) {
          console.error('Error loading branch commits:', err)
          return null
        }
      })

      Promise.all(loadPromises).then(results => {
        const newCommits = results.reduce((acc, result) => {
          if (result) acc[result.branchName] = result.commits
          return acc
        }, {})

        if (Object.keys(newCommits).length > 0) {
          setBranchCommits(prev => ({ ...prev, ...newCommits }))
        }
      })
    }
  }, [expandedBranches, tagSearchTerm, branches])

  return (
    <div className={styles.branchManagement}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerPrefixSection}>
            <Tag size={12} className={styles.prefixIcon} />
            <span className={styles.prefixHeaderLabel}>Prefix</span>
            {selectedPrefixes.length > 0 ? (
              <div className={styles.prefixChips}>
                {selectedPrefixes.map((p) => (
                  <span key={p} className={styles.prefixChip}>
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.placeholder}>None selected</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.topTools}>
        <div className={styles.createSection}>
          <input
            type="text"
            value={newBranchName}
            onChange={setNewBranchName}
            placeholder="New branch name..."
            className={styles.branchInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newBranchName.trim() && !loading) {
                handleCreateBranch()
              }
            }}
          />
          <button
            onClick={handleCreateBranch}
            disabled={loading || !newBranchName.trim()}
            className={styles.createBtn}
          >
            <Plus size={14} />
            <span>Create</span>
          </button>
        </div>
      </div>
      
      {/* Search inputs */}
      <div className={styles.searchContainer}>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search branches..."
          customStyle={{ flex: 1 }}
        />
        <SearchInput
          value={tagSearchTerm}
          onChange={(e) => setTagSearchTerm(e.target.value)}
          placeholder="Search tags..."
          customStyle={{ flex: 1 }}
        />
      </div>
      
      {/* Tag legend */}
      <div className={styles.tagLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles.localOnly}`}>
            <Tag size={8} />
          </span>
          <span className={styles.legendText}>Local only</span>
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles.synced}`}>
            <Tag size={8} />
          </span>
          <span className={styles.legendText}>Synced</span>
        </span>
      </div>
      
      {loadingCommits && tagSearchTerm && (
        <div className={styles.loadingHint}>
          <RefreshCw size={12} className={styles.spinning} />
          <span>Loading commits...</span>
        </div>
      )}
      <div className={styles.listSection}>
        <div className={styles.branchListContainer}>
          {loading && !branches.length ? (
            <div className={styles.loading}>
              <RefreshCw size={24} className={styles.spinning} />
              <p>Fetching branches...</p>
            </div>
          ) : (
            <div className={styles.scrollArea}>
              {/* Local Branches */}
              <div className={styles.branchGroup}>
                <div
                  className={styles.groupHeader}
                  onClick={() => setIsLocalBranchesCollapsed(!isLocalBranchesCollapsed)}
                >
                  <ChevronDown
                    className={`${styles.chevronIcon} ${isLocalBranchesCollapsed ? styles.collapsed : ''}`}
                    size={14}
                  />
                  <span>LOCAL</span>
                </div>
                {!isLocalBranchesCollapsed && (
                  <div className={styles.groupContent}>
                    {sortedLocalBranches.length > 0 ? (
                      sortedLocalBranches.map((branchObj) => {
                        const branch = typeof branchObj === 'string' ? branchObj : branchObj.name
                        const { ahead = 0, behind = 0, tags = [] } = branchObj || {}
                        const isActive = branch === currentBranch

                        return (
                          <div key={`local-${branch}`}>
                            <div
                              onDoubleClick={() => !isActive && onCheckout(branch)}
                              onClick={() => handleBranchClick(branch)}
                              className={`${styles.branchItem} ${isActive ? styles.active : ''} ${expandedBranches.has(branch) || (tagSearchTerm && branchCommits[branch]) ? styles.expanded : ''}`}
                              onContextMenu={(e) => handleContextMenu(e, 'branch', branch)}
                            >
                              <div className={styles.branchMain}>
                                <GitBranch size={14} className={styles.itemIcon} />
                                <span className={styles.branchNameText}>{branch}</span>
                                {isActive && (
                                  <CheckCircle2 size={12} className={styles.activeCheck} />
                                )}
                                <div className={styles.syncStatus}>
                                  {ahead > 0 && (
                                    <span className={styles.ahead}>
                                      <ArrowUpRight size={10} />
                                      {ahead}
                                    </span>
                                  )}
                                  {behind > 0 && (
                                    <span className={styles.behind}>
                                      <ArrowDownLeft size={10} />
                                      {behind}
                                    </span>
                                  )}
                                </div>
                                {tags.length > 0 && (
                                  <div className={styles.tagBadges}>
                                    {tags.slice(0, 2).map((tag) => {
                                      const isLocalOnly = localOnlyTags.includes(tag)
                                      return (
                                        <span 
                                          key={tag} 
                                          className={`${styles.tagBadge} ${isLocalOnly ? styles.localOnly : styles.synced}`} 
                                          title={isLocalOnly ? `${tag} (Local only)` : `${tag} (Synced)`}
                                        >
                                          <Tag size={9} />
                                          {tag}
                                        </span>
                                      )
                                    })}
                                    {tags.length > 2 && (
                                      <span className={styles.tagBadge} title={tags.slice(2).join(', ')}>
                                        +{tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className={styles.itemActions}>
                                  <CopyButton textToCopy={branch} size={12} showCopiedText={false} />
                                  {!isActive && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (onRequestDeleteBranch) {
                                          onRequestDeleteBranch(branch, false)
                                        }
                                      }}
                                      className={styles.itemDeleteBtn}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Show commits when expanded or when tag search is active */}
                            {(expandedBranches.has(branch) || (tagSearchTerm && branchCommits[branch])) && branchCommits[branch] && (
                              <div className={styles.commitHistory}>
                                {filterCommitsByTag(branchCommits[branch]).length > 0 ? (
                                  filterCommitsByTag(branchCommits[branch]).map((commit) => (
                                    <div 
                                      key={commit.hash} 
                                      className={styles.commitItem}
                                      onContextMenu={(e) => handleContextMenu(e, 'commit', commit)}
                                    >
                                      <div className={styles.commitDot} />
                                      <div className={styles.commitDetails}>
                                        <div className={styles.commitMessage}>{commit.message}</div>
                                        <div className={styles.commitMeta}>
                                          <span className={styles.commitHash}>
                                            {commit.shortHash}
                                          </span>
                                          <span className={styles.commitAuthor}>{commit.author}</span>
                                          {commit.tags.length > 0 && (
                                            <div className={styles.commitTags}>
                                              {commit.tags.map((tag) => {
                                                const isLocalOnly = localOnlyTags.includes(tag)
                                                return (
                                                  <span 
                                                    key={tag} 
                                                    className={`${styles.commitTag} ${isLocalOnly ? styles.localOnly : styles.synced}`}
                                                    title={isLocalOnly ? `${tag} (Local only)` : `${tag} (Synced)`}
                                                  >
                                                    <Tag size={8} />
                                                    {tag}
                                                  </span>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : tagSearchTerm ? (
                                  <div className={styles.noCommits}>
                                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.3)', padding: '8px' }}>
                                      No commits with tag "{tagSearchTerm}"
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className={styles.loading} style={{ height: 'auto', padding: '20px' }}>
                        <p style={{ fontSize: '12px' }}>No matching local branches</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Remote Branches */}
              {remoteBranches.length > 0 && (
                <div className={styles.branchGroup}>
                  <div
                    className={styles.groupHeader}
                    onClick={() => setIsRemoteBranchesCollapsed(!isRemoteBranchesCollapsed)}
                  >
                    <ChevronDown
                      className={`${styles.chevronIcon} ${isRemoteBranchesCollapsed ? styles.collapsed : ''}`}
                      size={14}
                    />
                    <span>REMOTE</span>
                  </div>
                  {!isRemoteBranchesCollapsed && (
                    <div className={styles.groupContent}>
                      {sortedRemoteBranches.length > 0 ? (
                        sortedRemoteBranches.map((branchObj) => {
                          const branch = typeof branchObj === 'string' ? branchObj : branchObj.name
                          const isActive = branch === currentBranch
                          return (
                            <div
                              key={`remote-${branch}`}
                              onDoubleClick={() => !isActive && onCheckout(branch)}
                              className={`${styles.branchItem} ${isActive ? styles.active : ''}`}
                              onContextMenu={(e) => handleContextMenu(e, 'branch', branch)}
                            >
                              <div className={styles.branchMain}>
                                <GitBranch size={14} className={styles.itemIcon} />
                                <span className={styles.branchNameText}>{branch}</span>
                                {isActive && (
                                  <CheckCircle2 size={12} className={styles.activeCheck} />
                                )}
                                <div className={styles.itemActions}>
                                  <CopyButton
                                    textToCopy={branch}
                                    size={12}
                                    showCopiedText={false}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (onRequestDeleteBranch) {
                                        onRequestDeleteBranch(branch, true)
                                      }
                                    }}
                                    className={styles.itemDeleteBtn}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className={styles.loading} style={{ height: 'auto', padding: '20px' }}>
                          <p style={{ fontSize: '12px' }}>No matching remote branches</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {renameBranchState.show && (
        <div
          className={styles.modalOverlay}
          onClick={() => setRenameBranchState({ show: false, oldName: '', newName: '' })}
        >
          <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
            <h3>Rename Branch</h3>
            <div className={styles.modalBody}>
              <div className={styles.modalOldName}>
                <span>Current:</span>
                <code>{renameBranchState.oldName}</code>
              </div>
              <input
                value={renameBranchState.newName}
                onChange={(e) =>
                  setRenameBranchState((prev) => ({ ...prev, newName: e.target.value }))
                }
                placeholder="New branch name"
                className={styles.modalInput}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename()
                }}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setRenameBranchState({ show: false, oldName: '', newName: '' })}
                className={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                disabled={
                  !renameBranchState.newName ||
                  renameBranchState.newName === renameBranchState.oldName
                }
                className={styles.modalConfirm}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {createTagState.show && (
        <div
          className={styles.modalOverlay}
          onClick={() => setCreateTagState({ show: false, branchName: '', tagName: '' })}
        >
          <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
            <h3>Create Tag</h3>
            <div className={styles.modalBody}>
              <div className={styles.modalOldName}>
                <span>Branch:</span>
                <code>{createTagState.branchName?.replace('origin/', '')}</code>
              </div>
              <input
                value={createTagState.tagName}
                onChange={(e) =>
                  setCreateTagState((prev) => ({ ...prev, tagName: e.target.value }))
                }
                placeholder="Tag name (e.g., v1.0.0)"
                className={styles.modalInput}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreateTag()
                }}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setCreateTagState({ show: false, branchName: '', tagName: '' })}
                className={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                onClick={submitCreateTag}
                disabled={!createTagState.tagName || !createTagState.tagName.trim()}
                className={styles.modalConfirm}
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}

      <BranchContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        type={contextMenu.type}
        target={contextMenu.target}
        branchTags={contextMenu.tags}
        localOnlyTags={localOnlyTags}
        currentBranch={currentBranch}
        onMerge={onMerge}
        onCheckout={onCheckout}
        onCheckoutCommit={onCheckoutCommit}
        onRename={handleRenameBranch}
        onCreateTag={handleCreateTag}
        onDeleteTag={onDeleteTag}
        onRequestDeleteTag={onRequestDeleteTag}
        onRequestDeleteBranch={onRequestDeleteBranch}
        onPushTag={onPushTag}
        onRefreshCommits={handleRefreshCommits}
        onClose={closeContextMenu}
      />
    </div>
  )
}

export default BranchList
