import React, { useState } from 'react'
import { Modal, Input, App } from 'antd'
import {
  Copy,
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  GitMerge,
  Edit3,
  Search,
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

const BranchList = ({
  branches = [],
  remoteBranches = [],
  currentBranch,
  loading,
  onCheckout,
  onDelete,
  onDeleteRemote,
  onMerge,
  newBranchName,
  setNewBranchName,
  createBranchByNewBranchName,
  prefixes = [],
  selectedPrefixes = [],
  onAddPrefix,
  onRename,
  onCreateTag
}) => {
  const { modal, message: messageApi } = App.useApp()
  const [contextMenu, setContextMenu] = React.useState({
    show: false,
    x: 0,
    y: 0,
    branchName: null
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

  const handleContextMenu = (e, branchName) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      branchName: branchName
    })
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [isRemoteBranchesCollapsed, setIsRemoteBranchesCollapsed] = useState(false)
  const [isLocalBranchesCollapsed, setIsLocalBranchesCollapsed] = useState(false)

  const sortBranches = (branchesList) => {
    return [...branchesList]
      .filter((branch) => {
        const name = typeof branch === 'string' ? branch : branch.name
        return searchTerm === '' || name.toLowerCase().includes(searchTerm.toLowerCase())
      })
      .sort((a, b) => {
        const nameA = typeof a === 'string' ? a : a.name
        const nameB = typeof b === 'string' ? b : b.name
        if (nameB === currentBranch) return 1
        if (nameA === currentBranch) return -1
        return nameA.localeCompare(nameB)
      })
  }

  const branchPrefix = selectedPrefixes.join(',')

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return

    const branchNames = branchPrefix
      ? branchPrefix
          .split(',')
          .map((p) => `${p.trim()}${newBranchName}`)
          .join(',')
      : newBranchName
    createBranchByNewBranchName(branchNames)
  }

  const handleRenameBranch = (oldName) => {
    setRenameBranchState({
      show: true,
      oldName: oldName,
      newName: oldName
    })
    setContextMenu({ show: false, x: 0, y: 0, branchName: null })
  }

  const handleCreateTag = (branchName) => {
    setCreateTagState({
      show: true,
      branchName: branchName,
      tagName: ''
    })
    setContextMenu({ show: false, x: 0, y: 0, branchName: null })
  }

  const submitCreateTag = async () => {
    if (createTagState.tagName && createTagState.tagName.trim()) {
      if (onCreateTag) {
        await onCreateTag(createTagState.tagName, createTagState.branchName)
      }
    }
    setCreateTagState({ show: false, branchName: '', tagName: '' })
  }

  const submitRename = () => {
    if (renameBranchState.newName && renameBranchState.newName !== renameBranchState.oldName) {
      onRename(renameBranchState.oldName, renameBranchState.newName)
    }
    setRenameBranchState({ show: false, oldName: '', newName: '' })
  }

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
      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search branches..."
        customStyle={{ marginTop: '10px', marginBottom: '10px' }}
      />
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
                    {sortBranches(branches).length > 0 ? (
                      sortBranches(branches).map((branchObj) => {
                        const branch = typeof branchObj === 'string' ? branchObj : branchObj.name
                        const { ahead = 0, behind = 0, tags = [] } = branchObj || {}
                        const isActive = branch === currentBranch

                        return (
                          <div
                            key={`local-${branch}`}
                            onDoubleClick={() => !isActive && onCheckout(branch)}
                            className={`${styles.branchItem} ${isActive ? styles.active : ''}`}
                            onContextMenu={(e) => handleContextMenu(e, branch)}
                          >
                            <div className={styles.branchMain}>
                              <GitBranch size={14} className={styles.itemIcon} />
                              <span className={styles.branchNameText}>{branch}</span>
                              {isActive && (
                                <CheckCircle2 size={12} className={styles.activeCheck} />
                              )}
                              {tags.length > 0 && (
                                <div className={styles.tagBadges}>
                                  {tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className={styles.tagBadge} title={tag}>
                                      <Tag size={9} />
                                      {tag}
                                    </span>
                                  ))}
                                  {tags.length > 2 && (
                                    <span className={styles.tagBadge} title={tags.slice(2).join(', ')}>
                                      +{tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className={styles.branchMeta}>
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

                              <div className={styles.itemActions}>
                                <CopyButton textToCopy={branch} size={12} showCopiedText={false} />
                                {!isActive && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDelete(branch)
                                    }}
                                    className={styles.itemDeleteBtn}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
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
                      {sortBranches(remoteBranches).length > 0 ? (
                        sortBranches(remoteBranches).map((branchObj) => {
                          const branch = typeof branchObj === 'string' ? branchObj : branchObj.name
                          const isActive = branch === currentBranch
                          return (
                            <div
                              key={`remote-${branch}`}
                              onDoubleClick={() => !isActive && onCheckout(branch)}
                              className={`${styles.branchItem} ${isActive ? styles.active : ''}`}
                              onContextMenu={(e) => handleContextMenu(e, branch)}
                            >
                              <div className={styles.branchMain}>
                                <GitBranch size={14} className={styles.itemIcon} />
                                <span className={styles.branchNameText}>{branch}</span>
                                {isActive && (
                                  <CheckCircle2 size={12} className={styles.activeCheck} />
                                )}
                              </div>

                              <div className={styles.branchMeta}>
                                <div className={styles.itemActions}>
                                  <CopyButton
                                    textToCopy={branch}
                                    size={12}
                                    showCopiedText={false}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDeleteRemote(branch)
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
        branchName={contextMenu.branchName}
        currentBranch={currentBranch}
        onMerge={onMerge}
        onCheckout={onCheckout}
        onRename={handleRenameBranch}
        onCreateTag={handleCreateTag}
        onClose={() => setContextMenu({ show: false, x: 0, y: 0, branchName: null })}
      />
    </div>
  )
}

export default BranchList
