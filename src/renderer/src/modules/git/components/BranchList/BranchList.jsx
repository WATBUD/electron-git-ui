import React, { useState } from 'react'
import { message } from 'antd'
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
  newBranchName,
  setNewBranchName,
  createBranchByNewBranchName,
  handleCreateFromBranchWithPrefix
}) => {
  const sortBranches = (branches) => {
    return [...branches]
      .filter(
        (branch) => searchTerm === '' || branch.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (b === currentBranch) return 1
        return a.localeCompare(b)
      })
  }

  const [branchPrefix, setBranchPrefix] = useState('promote-prod/,promote-stg2602/')
  const [searchTerm, setSearchTerm] = useState('')
  const [isRemoteBranchesCollapsed, setIsRemoteBranchesCollapsed] = useState(false)
  const [isLocalBranchesCollapsed, setIsLocalBranchesCollapsed] = useState(false)

  return (
    <div className={styles.branchManagement}>
      <div className={styles.branchPrefix}>
        <input
          type="text"
          value={branchPrefix}
          onChange={(e) => setBranchPrefix(e.target.value)}
          placeholder="Branch prefix (e.g., t1-)"
          className={styles.prefixInput}
        />
      </div>
      <div className={styles.createBranch}>
        <button
          onClick={() => {
            const fullBranchName = branchPrefix ? `${branchPrefix}${newBranchName}` : newBranchName
            setNewBranchName({ target: { value: fullBranchName } })
            createBranchByNewBranchName()
          }}
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
                  {sortBranches(branches).map((branch) => (
                    <li
                      key={`local-${branch}`}
                      onDoubleClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          branch !== currentBranch && onCheckout(branch)
                        }
                      }}
                      className={`${branch === currentBranch ? styles.activeBranch : styles.clickableBranch} ${styles.noSelect}`}
                      title={
                        branch === currentBranch ? 'Current branch' : 'Double-click to checkout'
                      }
                      onContextMenu={(e) => e.preventDefault()}
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
                            const branchName = branch.replace('refs/heads/', '')
                            const lastPart = branchName.split('/').pop()
                            const branchNames = branchPrefix
                              ? branchPrefix
                                  .split(',')
                                  .map((prefix) => `${prefix.trim()}${lastPart}`)
                              : [lastPart]
                            handleCreateFromBranchWithPrefix(branchNames.join(','))
                          }}
                          className={styles.createFromBtn}
                          title={`Create branch from ${branch.split('/').pop()} with prefix ${branchPrefix}`}
                        >
                          Create from with prefix
                        </button>
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
                  ))}
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
                          onContextMenu={(e) => e.preventDefault()}
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
    </div>
  )
}

export default BranchList
