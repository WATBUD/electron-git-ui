import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ErrorModal } from '../../../../shared/components/ErrorModal'
import { Toolbar } from '../../components/Toolbar'
import { FileStatus } from '../../components/FileStatus'
import { FooterArea } from '../../layout/FooterArea'
import { AppToolbar } from '../../layout/AppToolbar'
import LeftSideBar from '../../layout/LeftSideBar'
import BranchList from '../../components/BranchList'
import { GitGraphContainer } from './GitGraphContainer'
import {
  checkMergeInProgress,
  deleteBranch,
  loadBranches,
  createBranch,
  mergeBranch,
  checkoutBranch,
  deleteRemoteBranch,
  fetchFromRemote,
  pullFromRemote,
  pushToRemote,
  commitChanges,
  loadFileStatus,
  stageFile,
  unstageFile,
  discardFileChanges,
  selectRepository,
  clearError,
  loadCommitHistory,
  renameBranch
} from '../../store/git'
import styles from './main-page-git.module.css'
import { LoadingModal } from '../../../../shared/components/LoadingModal'
import { GIT_TABS } from '../../constants/tabs'

export const MainPageGit = () => {
  const [newBranchName, setNewBranchName] = useState('')
  const [activeTab, setActiveTab] = useState(GIT_TABS.BRANCH_VIEW)
  const error = useSelector((state) => state.git.error)

  // Get state from Redux
  const showFooter = useSelector((state) => state.git.showFooter)
  const hasMergeInProgress = useSelector((state) => state.git.hasMergeInProgress)
  const branches = useSelector((state) => state.git.branches)
  const remoteBranches = useSelector((state) => state.git.remoteBranches)
  const currentBranch = useSelector((state) => state.git.currentBranch)
  const fileStatus = useSelector((state) => state.git.fileStatus)
  const loading = useSelector((state) => state.git.loading)
  const loadingMessage = useSelector((state) => state.git.loadingMessage)
  const repoPath = useSelector((state) => state.git.repoPath)
  const mergeStatus = useSelector((state) => state.git.mergeStatus)
  const prefixes = useSelector((state) => state.git.prefixes)
  const selectedPrefixes = useSelector((state) => state.git.selectedPrefixes)
  const dispatch = useDispatch()

  useEffect(() => {
    // Debug: Check if window.git is available
    console.log('window.git available:', !!window.git)
    if (window.git) {
      console.log('Available git methods:', Object.keys(window.git))
    }
  }, [])

  const handleSelectRepository = async () => {
    const result = await dispatch(selectRepository())
  }

  useEffect(() => {
    if (repoPath) {
      dispatch(loadBranches())
      dispatch(loadFileStatus())
      dispatch(checkMergeInProgress())
    }
  }, [repoPath, dispatch])

  useEffect(() => {
    const handleFocus = () => {
      if (repoPath) {
        if (activeTab === GIT_TABS.FILES) {
          dispatch(loadFileStatus())
        }
        // if (activeTab === GIT_TABS.GRAPH) {
        //   dispatch(loadCommitHistory())
        // }
        if (activeTab === GIT_TABS.BRANCH_VIEW) {
          dispatch(checkMergeInProgress())
          dispatch(loadBranches())
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [repoPath, activeTab, dispatch])

  const getStatusText = (file) => {
    if (file.statusType) {
      const { staged, working } = file.statusType
      if (staged === 'M') return 'Staged Changes'
      if (staged === 'A') return 'Staged Addition'
      if (staged === 'D') return 'Staged Deletion'
      if (staged === 'R') return 'Staged Rename'
      if (staged === 'C') return 'Staged Copy'
      if (working === 'M') return 'Working Changes'
      if (working === 'A') return 'Working Addition'
      if (working === 'D') return 'Working Deletion'
      if (working === '?') return 'Untracked'
    }
    return 'Unknown'
  }

  const getStatusIcon = (file) => {
    const { staged, working } = file.statusType
    if (staged === 'M' || working === 'M') return '📝'
    if (staged === 'A' || working === 'A') return '➕'
    if (staged === 'D' || working === 'D') return '🗑️'
    if (staged === 'R') return '🔄'
    if (staged === 'C') return '📋'
    if (staged === '?' || working === '?') return '❓'
    return '📄'
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  return (
    <div className={styles.gitUi}>
      <div className={styles.toolbarContainer}>
        <AppToolbar />
        <div className={styles.repositorySelector}>
          <button onClick={handleSelectRepository} disabled={loading} className={styles.repoBtn}>
            {repoPath ? 'Change Repository' : 'Select Repository'}
          </button>
          {repoPath && (
            <div className={styles.repoInfo}>
              <span className={styles.repoPath}>{repoPath}</span>
              {hasMergeInProgress && mergeStatus?.message && (
                <span className={styles.mergeWarning} title={mergeStatus.message}>
                  ⚠️ {mergeStatus.message}
                </span>
              )}
            </div>
          )}
        </div>

        {repoPath && (
          <Toolbar
            onPull={async () => {
              await dispatch(pullFromRemote())
            }}
            onFetch={async (pruneBranches) => {
              await dispatch(fetchFromRemote(pruneBranches))
            }}
            onPush={async (forcePush) => {
              await dispatch(pushToRemote(forcePush))
            }}
            onCommit={async (commitMessage) => {
              await dispatch(commitChanges(commitMessage))
            }}
            loading={loading}
          />
        )}
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.contentArea}>
          <LeftSideBar activeTab={activeTab} onTabChange={handleTabChange} />
          <div className={styles.mainContent}>
            {repoPath && (
              <>
                {activeTab === GIT_TABS.BRANCH_VIEW && (
                  <BranchList
                    branches={branches}
                    remoteBranches={remoteBranches}
                    currentBranch={currentBranch}
                    loading={loading}
                    onCheckout={async (branchName) => {
                      await dispatch(checkoutBranch(branchName))
                    }}
                    onDelete={async (branchName) => {
                      await dispatch(deleteBranch(branchName))
                    }}
                    onDeleteRemote={async (branchName) => {
                      const result = await dispatch(deleteRemoteBranch(branchName))
                    }}
                    onRefresh={() => {
                      dispatch(loadBranches())
                    }}
                    onMerge={async (branchName) => {
                      await dispatch(mergeBranch(branchName))
                    }}
                    onRename={async (oldName, newName) => {
                      await dispatch(renameBranch({ oldName, newName }))
                    }}
                    prefixes={prefixes}
                    selectedPrefixes={selectedPrefixes}
                    onAddPrefix={(prefix) => dispatch(addPrefix(prefix))}
                    newBranchName={newBranchName}
                    setNewBranchName={(e) => setNewBranchName(e.target.value)}
                    createBranchByNewBranchName={async (fullName) => {
                      const nameToCreate = typeof fullName === 'string' ? fullName : newBranchName
                      if (!nameToCreate.trim()) return

                      const names = nameToCreate
                        .split(',')
                        .map((name) => name.trim())
                        .filter(Boolean)

                      for (const name of names) {
                        await dispatch(createBranch(name))
                      }
                      setNewBranchName('')
                      dispatch(loadBranches())
                    }}
                  />
                )}

                {activeTab === GIT_TABS.GRAPH && <GitGraphContainer />}

                {activeTab === GIT_TABS.FILES && (
                  <FileStatus
                    fileStatus={fileStatus}
                    onStageFile={async (file) => {
                      const result = await dispatch(stageFile(file))
                      if (stageFile.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    onUnstageFile={async (file) => {
                      const result = await dispatch(unstageFile(file))
                      if (unstageFile.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    getStatusIcon={getStatusIcon}
                    getStatusText={getStatusText}
                    onDiscardChanges={async (file) => {
                      const result = await dispatch(discardFileChanges(file))
                      if (discardFileChanges.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    onRefresh={() => {
                      dispatch(loadFileStatus())
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: showFooter ? 'block' : 'none' }}>
          <FooterArea />
        </div>
      </div>
      <LoadingModal message={loadingMessage} />
      <ErrorModal error={error} show={!!error} onClose={() => dispatch(clearError())} />
    </div>
  )
}
