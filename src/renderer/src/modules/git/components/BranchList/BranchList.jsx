import React, { useState } from 'react'
import { Modal, Input, App } from 'antd'
import { Copy, ChevronDown } from 'lucide-react'
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
  onRefresh,
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
  const sortBranches = (branches) => {
    return [...branches]
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

  const [searchTerm, setSearchTerm] = useState('')
  const [isRemoteBranchesCollapsed, setIsRemoteBranchesCollapsed] = useState(false)
  const [isLocalBranchesCollapsed, setIsLocalBranchesCollapsed] = useState(false)

  return (
    <div className={styles.branchManagement}>
      <div className={styles.branchPrefix}>
        <div className={styles.prefixInputWrapper}>
          <span className={styles.prefixLabel}>BranchPrefix:</span>
          <input
            type="text"
            value={branchPrefix}
            readOnly
            placeholder="Select prefixes from toolbar"
            className={`${styles.prefixInput} ${styles.readOnlyInput}`}
          />
        </div>
      </div>
      <div className={styles.createBranch}>
        <input
          type="text"
          value={newBranchName}
          onChange={setNewBranchName}
          placeholder="New branch name"
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
          Create Branch
        </button>
      </div>

      <div className={styles.branchList}>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search branches..."
        />
        <div className={styles.branchListHeader}>
          <h3>
            Branches: <span className={styles.currentBranch}>{currentBranch}</span>
          </h3>
          <button
            onClick={onRefresh}
            disabled={loading}
            className={styles.refreshBtn}
            title="Refresh branches"
          >
            Refresh
          </button>
        </div>

        <div className={styles.branchListContainer}>
          {loading ? (
            <div className={styles.loading}>Loading branches...</div>
          ) : (
            <>
              <div className={styles.branchSection}>
                <div
                  className={styles.sectionHeader}
                  onClick={() => setIsLocalBranchesCollapsed(!isLocalBranchesCollapsed)}
                >
                  <ChevronDown
                    className={`${styles.chevronIcon} ${isLocalBranchesCollapsed ? styles.collapsed : ''}`}
                    size={16}
                  />
                  <span>Local Branches</span>
                </div>
                {!isLocalBranchesCollapsed && (
                  <ul>
                    {sortBranches(branches).map((branchObj) => {
                      const branch = typeof branchObj === 'string' ? branchObj : branchObj.name
                      const { ahead = 0, behind = 0 } = branchObj || {}

                      return (
                        <li
                          key={`local-${branch}`}
                          onDoubleClick={(e) => {
                            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                              branch !== currentBranch && onCheckout(branch)
                            }
                          }}
                          className={`${branch === currentBranch ? styles.activeBranch : styles.clickableBranch} ${styles.noSelect}`}
                          title={
                            branch === currentBranch ? 'Current branch' : 'Double-click to checkout'
                          }
                          onContextMenu={(e) => handleContextMenu(e, branch)}
                        >
                          <div className={styles.branchInfo}>
                            <span className={styles.branchName}>
                              {branch}
                              {branch === currentBranch && (
                                <span className={styles.currentBranchIndicator}> (current)</span>
                              )}
                            </span>
                            <div className={styles.branchStatus}>
                              {ahead > 0 && <span className={styles.aheadCount}>↑{ahead}</span>}
                              {behind > 0 && <span className={styles.behindCount}>↓{behind}</span>}
                            </div>
                          </div>
                          <div className={styles.branchActions}>
                            <CopyButton
                              textToCopy={branch}
                              title="Copy branch name"
                              size={14}
                              showCopiedText={true}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete(branch)
                              }}
                              className={styles.deleteBtn}
                              title="Delete branch"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {remoteBranches.length > 0 && (
                <div className={styles.branchSection}>
                  <div
                    className={styles.sectionHeader}
                    onClick={() => setIsRemoteBranchesCollapsed(!isRemoteBranchesCollapsed)}
                  >
                    <ChevronDown
                      className={`${styles.chevronIcon} ${isRemoteBranchesCollapsed ? styles.collapsed : ''}`}
                      size={16}
                    />
                    <span>Remote Branches</span>
                  </div>
                  {!isRemoteBranchesCollapsed && (
                    <ul>
                      {sortBranches(remoteBranches).map((branch) => (
                        <li
                          key={`remote-${branch}`}
                          onDoubleClick={(e) => {
                            if (e.target.tagName !== 'BUTTON') {
                              branch !== currentBranch && onCheckout(branch)
                            }
                          }}
                          className={`${branch === currentBranch ? styles.activeBranch : styles.clickableBranch} ${styles.noSelect}`}
                          title={
                            branch === currentBranch ? 'Current branch' : 'Double-click to checkout'
                          }
                          onContextMenu={(e) => handleContextMenu(e, branch)}
                        >
                          <span>
                            {branch}
                            {branch === currentBranch && (
                              <span className={styles.currentBranchIndicator}> (current)</span>
                            )}
                          </span>
                          <div className={styles.branchActions}>
                            <CopyButton
                              textToCopy={branch}
                              title="Copy branch name"
                              size={14}
                              showCopiedText={true}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteRemote(branch)
                              }}
                              className={styles.deleteBtn}
                              title="Delete branch"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {renameBranchState.show && (
        <Modal
          title="Rename Branch"
          open={renameBranchState.show}
          onOk={submitRename}
          onCancel={() => setRenameBranchState({ show: false, oldName: '', newName: '' })}
          okText="Rename"
          cancelText="Cancel"
          destroyOnClose
        >
          <div style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Old Name: <span style={{ fontWeight: 600 }}>{renameBranchState.oldName}</span>
            </div>
            <Input
              value={renameBranchState.newName}
              onChange={(e) =>
                setRenameBranchState((prev) => ({ ...prev, newName: e.target.value }))
              }
              placeholder="Enter new branch name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename()
              }}
            />
          </div>
        </Modal>
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
            Branch: {contextMenu.branchName?.replace('origin/', '')}
          </div>
          <div className={styles.contextMenuContent}>
            <button
              className={`${styles.contextMenuItem} ${styles.mergeItem}`}
              onClick={() => {
                onMerge(contextMenu.branchName)
                setContextMenu({ show: false, x: 0, y: 0, branchName: null })
              }}
              disabled={contextMenu.branchName === currentBranch}
            >
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
              Checkout
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => handleRenameBranch(contextMenu.branchName)}
              disabled={!contextMenu.branchName || contextMenu.branchName.includes('origin/')}
            >
              Rename branch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchList
