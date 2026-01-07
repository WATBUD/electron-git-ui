import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ErrorModal } from '../../../../shared/components/ErrorModal'
import { GitGraph } from '../../components/GitGraph'
import { Toolbar } from '../../components/Toolbar'
import { FileStatus } from '../../components/FileStatus'
import { FooterArea } from '../../layout/FooterArea'
import { AppToolbar } from '../../layout/AppToolbar'
import LeftSideBar from '../../layout/LeftSideBar'
import BranchList from '../../components/BranchList'
import {
  checkMergeInProgress,
  deleteBranch,
  loadBranches,
  createBranch,
  checkoutBranch,
  deleteRemoteBranch,
  fetchFromRemote,
  pushToRemote,
  commitChanges,
  loadFileStatus,
  stageFile,
  unstageFile,
  discardFileChanges,
  selectRepository,
  clearError
} from '../../store/git'
import './main-page-git.css'
import { LoadingModal } from '../../../../shared/components/LoadingModal'

export const MainPageGit = () => {
  const [newBranchName, setNewBranchName] = useState('')
  const [activeTab, setActiveTab] = useState('main') // 'main', 'graph', or 'files'
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
  // console.log('main-page-git+currentBranch:', currentBranch);
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



  return (
    <div className="git-ui">
      <div className="toolbar-container">
        <AppToolbar />
        <div className="repository-selector">
          <button onClick={handleSelectRepository} disabled={loading} className="repo-btn">
            {repoPath ? 'Change Repository' : 'Select Repository'}
          </button>
          {repoPath && (
            <div className="repo-info">
              <span className="repo-path">{repoPath}</span>
              {hasMergeInProgress && mergeStatus?.message && (
                <span className="merge-warning" title={mergeStatus.message}>
                  ⚠️ {mergeStatus.message}
                </span>
              )}
            </div>
          )}
        </div>

        {repoPath && (
          <Toolbar
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


      <div className="main-layout">
        <div className="content-area">
          <LeftSideBar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="main-content">
            {repoPath && (
              <>
                {activeTab === 'main' && (
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
                    newBranchName={newBranchName}
                    setNewBranchName={(e) => setNewBranchName(e.target.value)}
                    createBranchByNewBranchName={async () => {
                      if (!newBranchName.trim()) return
                      const result = await dispatch(createBranch(newBranchName))
                      if (createBranch.fulfilled.match(result)) {
                        setNewBranchName('')
                      }
                    }}
                    handleCreateFromBranchWithPrefix={async (branchNames) => {
                      console.log('handleCreateFromBranchWithPrefix+branchNames', branchNames);
                      if (!branchNames.trim()) return;
                      
                      const names = branchNames.split(',').map(name => name.trim()).filter(Boolean);
                      
                      for (const name of names) {
                        console.log('Creating branch:', name);
                        const result = await dispatch(createBranch(name));
                        if (!createBranch.fulfilled.match(result)) {
                          console.error('Failed to create branch:', name);
                          break; // Stop if any branch creation fails
                        }
                      }
                      
                      // Refresh branches after all creations are done
                      dispatch(loadBranches());
                    }}
                  />
                )}

                {activeTab === 'graph' && <GitGraph repoPath={repoPath} />}

                {activeTab === 'files' && (
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
