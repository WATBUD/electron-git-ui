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
  onRename
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
  const contextMenuRef = React.useRef(null)

  const handleContextMenu = (e, branchName) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      branchName: branchName
    })
  }

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ show: false, x: 0, y: 0, branchName: null })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
                        const { ahead = 0, behind = 0 } = branchObj || {}
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

      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            top: contextMenu.y,
            left: contextMenu.x
          }}
        >
          <div className={styles.contextMenuHeader}>
            {contextMenu.branchName?.replace('origin/', '')}
          </div>
          <div className={styles.contextMenuContent}>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onMerge(contextMenu.branchName)
                setContextMenu({ show: false, x: 0, y: 0, branchName: null })
              }}
              disabled={contextMenu.branchName === currentBranch}
            >
              <GitMerge size={14} />
              <span>Merge into {currentBranch}</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onCheckout(contextMenu.branchName)
                setContextMenu({ show: false, x: 0, y: 0, branchName: null })
              }}
              disabled={contextMenu.branchName === currentBranch}
            >
              <ArrowDownLeft size={14} />
              <span>Checkout</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleRenameBranch(contextMenu.branchName)}
              disabled={!contextMenu.branchName || contextMenu.branchName.includes('origin/')}
            >
              <Edit3 size={14} />
              <span>Rename</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchList
