import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingModal } from './LoadingModal';
import { ErrorModal } from './ErrorModal';
import { GitGraph } from './GitGraph';
import { Toolbar } from './Toolbar';
import { FileStatus } from './FileStatus';
import { RefreshButton } from './RefreshButton';
import { FooterArea } from './FooterArea';
import { AppToolbar } from './AppToolbar';
import LeftSideBar from './LeftSideBar';
import BranchList from './BranchList';
import { 
  abortMerge, 
  checkMergeInProgress, 
  refreshTags,
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
  updateCommandHistory,
  selectRepository
} from '../store/gitSlice';
import './GitUI.css';

export const GitUI = () => {
  const [newBranchName, setNewBranchName] = useState('');
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'graph', or 'files'
  
  // Get state from Redux
  const showFooter = useSelector((state) => state.git.showFooter);
  const hasMergeInProgress = useSelector((state) => state.git.hasMergeInProgress);
  const branches = useSelector((state) => state.git.branches);
  const remoteBranches = useSelector((state) => state.git.remoteBranches);
  const currentBranch = useSelector((state) => state.git.currentBranch);
  const fileStatus = useSelector((state) => state.git.fileStatus);
  const loading = useSelector((state) => state.git.loading);
  const loadingMessage = useSelector((state) => state.git.loadingMessage);
  const repoPath = useSelector((state) => state.git.repoPath);
  const mergeStatus = useSelector((state) => state.git.mergeStatus);
  
  const dispatch = useDispatch();

  useEffect(() => {
    // Debug: Check if window.git is available
    console.log('window.git available:', !!window.git);
    if (window.git) {
      console.log('Available git methods:', Object.keys(window.git));
    }
  }, []);

  const handleSelectRepository = async () => {
    const result = await dispatch(selectRepository());
    if (selectRepository.fulfilled.match(result)) {
      dispatch(updateCommandHistory());
    }
  };

  useEffect(() => {
    if (repoPath) {
      dispatch(loadBranches());
      dispatch(loadFileStatus());
      dispatch(updateCommandHistory());
    }
  }, [repoPath, dispatch]);

  const getStatusText = (file) => {
    if (file.statusType) {
      const { staged, working } = file.statusType;
      if (staged === 'M') return 'Staged Changes';
      if (staged === 'A') return 'Staged Addition';
      if (staged === 'D') return 'Staged Deletion';
      if (staged === 'R') return 'Staged Rename';
      if (staged === 'C') return 'Staged Copy';
      if (working === 'M') return 'Working Changes';
      if (working === 'A') return 'Working Addition';
      if (working === 'D') return 'Working Deletion';
      if (working === '?') return 'Untracked';
    }
    return 'Unknown';
  };

  const getStatusIcon = (file) => {
    const { staged, working } = file.statusType;
    if (staged === 'M' || working === 'M') return '📝';
    if (staged === 'A' || working === 'A') return '➕';
    if (staged === 'D' || working === 'D') return '🗑️';
    if (staged === 'R') return '🔄';
    if (staged === 'C') return '📋';
    if (staged === '?' || working === '?') return '❓';
    return '📄';
  };

  // Update merge status when repo changes
  useEffect(() => {
    if (repoPath) {
      dispatch(checkMergeInProgress());
    }
  }, [repoPath, dispatch]);

  return (
    <div className="git-ui">
      <AppToolbar />
      <LoadingModal message={loadingMessage} />
      <ErrorModal />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 'calc(100vh - 48px)', /* Account for AppToolbar height */
        backgroundColor: '#f8fafc',
      }}>
        <LeftSideBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="main-content" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '20px 30px',
          boxSizing: 'border-box',
        }}>
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
              const result = await dispatch(fetchFromRemote(pruneBranches));
              if (fetchFromRemote.fulfilled.match(result)) {
                dispatch(loadBranches());
                dispatch(updateCommandHistory());
              }
            }}
            onPush={async (forcePush) => {
              const result = await dispatch(pushToRemote(forcePush));
              if (pushToRemote.fulfilled.match(result)) {
                dispatch(loadBranches());
                dispatch(updateCommandHistory());
              }
            }}
            onCommit={async (commitMessage) => {
              const result = await dispatch(commitChanges(commitMessage));
              if (commitChanges.fulfilled.match(result)) {
                dispatch(loadFileStatus());
                dispatch(updateCommandHistory());
              }
            }}
            loading={loading}
          />
        )}

        {repoPath && (
          <>
            {activeTab === 'main' && (
              <BranchList
                branches={branches}
                remoteBranches={remoteBranches}
                currentBranch={currentBranch}
                loading={loading}
                onCheckout={async (branchName) => {
                  const result = await dispatch(checkoutBranch(branchName));
                  if (checkoutBranch.fulfilled.match(result)) {
                    dispatch(loadBranches());
                    dispatch(updateCommandHistory());
                  }
                }}
                onDelete={async (branchName) => {
                  const result = await dispatch(deleteBranch(branchName));
                  if (deleteBranch.fulfilled.match(result)) {
                    dispatch(loadBranches());
                    dispatch(updateCommandHistory());
                  }
                }}
                onDeleteRemote={async (branchName) => {
                  const result = await dispatch(deleteRemoteBranch(branchName));
                  if (deleteRemoteBranch.fulfilled.match(result)) {
                    dispatch(loadBranches());
                    dispatch(updateCommandHistory());
                  }
                }}
                onRefresh={() => {
                  dispatch(loadBranches());
                  dispatch(updateCommandHistory());
                }}
                newBranchName={newBranchName}
                onBranchNameChange={(e) => setNewBranchName(e.target.value)}
                onCreateBranch={async () => {
                  if (!newBranchName.trim()) return;
                  const result = await dispatch(createBranch(newBranchName));
                  if (createBranch.fulfilled.match(result)) {
                    setNewBranchName('');
                    dispatch(updateCommandHistory());
                  }
                }}
              />
            )}

            {activeTab === 'graph' && <GitGraph repoPath={repoPath} />}

            {activeTab === 'files' && (
              <FileStatus
                fileStatus={fileStatus}
                onStageFile={async (file) => {
                  const result = await dispatch(stageFile(file));
                  if (stageFile.fulfilled.match(result)) {
                    dispatch(loadFileStatus());
                    dispatch(updateCommandHistory());
                  }
                }}
                onUnstageFile={async (file) => {
                  const result = await dispatch(unstageFile(file));
                  if (unstageFile.fulfilled.match(result)) {
                    dispatch(loadFileStatus());
                    dispatch(updateCommandHistory());
                  }
                }}
                getStatusIcon={getStatusIcon}
                getStatusText={getStatusText}
                onRefresh={() => {
                  dispatch(loadFileStatus());
                  dispatch(updateCommandHistory());
                }}
                loading={loading}
                loadingMessage={loadingMessage}
              />
            )}
          </>
        )}
        </div>
      </div>

      {showFooter && <FooterArea />}
    </div>
  );
}; 