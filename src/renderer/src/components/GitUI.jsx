import React, { useState, useEffect } from 'react';
import { LoadingModal } from './LoadingModal';
import { GitGraph } from './GitGraph';
import { Toolbar } from './Toolbar';
import { FileStatus } from './FileStatus';
import { RefreshButton } from './RefreshButton';
import { FooterArea } from './FooterArea';
import { AppToolbar } from './AppToolbar';
import './GitUI.css';

export const GitUI = () => {
  const [branches, setBranches] = useState([]);
  const [remoteBranches, setRemoteBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState(null);
  const [repoPath, setRepoPath] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [fileStatus, setFileStatus] = useState([]);
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'graph', or 'files'
  const [activeCommandTab, setActiveCommandTab] = useState('history');
  const [showFooter, setShowFooter] = useState(true);
  const [hasMergeInProgress, setHasMergeInProgress] = useState(false);

  useEffect(() => {
    // Debug: Check if window.git is available
    console.log('window.git available:', !!window.git);
    if (window.git) {
      console.log('Available git methods:', Object.keys(window.git));
    }
  }, []);

  const updateCommandHistory = async () => {
    if (window.git) {
      const history = await window.git.getCommandHistory();
      setCommandHistory(history);
    }
  };

  const handleClearHistory = async () => {
    if (window.git) {
      await window.git.clearCommandHistory();
      setCommandHistory([]);
    }
  };

  const startLoading = (message) => {
    setLoadingMessage(message);
    setLoading(true);
  };

  const stopLoading = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  const handleSelectRepository = async () => {
    try {
      startLoading('Selecting repository...');
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.selectRepository();
      if (result && result.success) {
        setRepoPath(result.path);
        await updateCommandHistory();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error selecting repository:', err);
    } finally {
      stopLoading();
    }
  };

  const [mergeStatus, setMergeStatus] = useState({ isInProgress: false, message: '' });

  const checkMergeInProgress = async () => {
    if (!repoPath || !window.git) {
      const status = { isInProgress: false, message: 'No repository selected' };
      setMergeStatus(status);
      setHasMergeInProgress(false);
      return false;
    }
    try {
      const result = await window.git.checkMergeInProgress();
      const status = {
        isInProgress: result?.isMergeInProgress || false,
        message: result?.output || 'No merge in progress',
        mergeHash: result?.mergeHeadHash || null
      };
      setMergeStatus(status);
      setHasMergeInProgress(status.isInProgress);
      return status.isInProgress;
    } catch (error) {
      console.error('Error checking merge status:', error);
      const status = { 
        isInProgress: false, 
        message: error.message || 'Error checking merge status' 
      };
      setMergeStatus(status);
      setHasMergeInProgress(false);
      return false;
    }
  };

  const refreshRepositoryState = async () => {
    await loadBranches();
    await checkMergeInProgress();
    await loadFileStatus();
  };

  const loadBranches = async () => {
    if (!repoPath) return;
    try {
      startLoading('Loading branches...');
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.listBranches();
      if (result.success) {
        setBranches(result.branches);
        setRemoteBranches(result.remoteBranches);
        // 從原始輸出中找到當前分支
        const rawOutput = result.command.output || '';
        const current = rawOutput.split('\n')
          .find(line => line.trim().startsWith('* '));
        if (current) {
          setCurrentBranch(current.trim().replace('* ', ''));
        }
        await updateCommandHistory();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading branches:', err);
    } finally {
      stopLoading();
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      startLoading(`Creating branch: ${newBranchName}...`);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.createBranch(newBranchName);
      if (result.success) {
        await updateCommandHistory();
        setBranches(prevBranches => [...prevBranches, newBranchName]);
        setNewBranchName('');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error creating branch:', err);
    } finally {
      stopLoading();
    }
  };

  const handleCheckout = async (branchName) => {
    try {
      startLoading(`Checking out branch: ${branchName}...`);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.checkoutBranch(branchName);
      if (result.success) {
        await updateCommandHistory();
        await loadBranches();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error checking out branch:', err);
    } finally {
      stopLoading();
    }
  };

  const handleDelete = async (branchName) => {
    try {
      startLoading(`Deleting branch: ${branchName}...`);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.deleteBranch(branchName);
      if (result.success) {
        await updateCommandHistory();
        await loadBranches();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting branch:', err);
    } finally {
      stopLoading();
    }
  };

  const handleDeleteRemote = async (branchName) => {
    try {
      startLoading(`Deleting remote branch: ${branchName}...`);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.deleteRemoteBranch(branchName);
      if (result.success) {
        await updateCommandHistory();
        await loadBranches();
      } else {
        alert(result.error || 'Failed to delete remote branch');
      }
    } catch (err) {
      alert(err.message);
      setError(err.message);
      console.error('Error deleting remote branch:', err);
    } finally {
      stopLoading();
    }
  };

  const handleFetch = async (pruneBranches) => {
    try {
      startLoading('Fetching from remote...');
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.fetch(pruneBranches);
      if (result.success) {
        await updateCommandHistory();
        await loadBranches();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching:', err);
    } finally {
      stopLoading();
    }
  };

  const handlePush = async (forcePush) => {
    try {
      startLoading('Pushing to remote...');
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.push(forcePush);
      if (result.success) {
        await updateCommandHistory();
        await loadBranches();
      } else {
        throw new Error(result.error || 'Failed to push changes');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error pushing:', err);
    } finally {
      stopLoading();
    }
  };

  const handleCommit = async (commitMessage) => {
    try {
      startLoading('Committing changes...');
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.commit(commitMessage);
      if (result.success) {
        await updateCommandHistory();
        await loadFileStatus();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error committing:', err);
    } finally {
      stopLoading();
    }
  };

  const loadFileStatus = async () => {
    if (!repoPath) return;
    try {
      startLoading('Loading file status...');
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.getStatus();
      if (result.success) {
        setFileStatus(result.files);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading file status:', err);
    } finally {
      stopLoading();
    }
  };

  const handleStageFile = async (file) => {
    try {
      startLoading(`Staging file: ${file}...`);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.stageFile(file);
      if (result.success) {
        await updateCommandHistory();
        await loadFileStatus();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error staging file:', err);
    } finally {
      stopLoading();
    }
  };

  const handleUnstageFile = async (file) => {
    try {
      startLoading(`Unstaging file: ${file}...`);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.unstageFile(file);
      if (result.success) {
        await updateCommandHistory();
        await loadFileStatus();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error unstaging file:', err);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    if (repoPath) {
      loadBranches();
      loadFileStatus();
    }
  }, [repoPath]);

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

  const handleMergeAbort = async () => {
    if (!window.git) {
      setError('Git API not initialized');
      return;
    }
    
    try {
      startLoading('Aborting merge...');
      const result = await window.git.mergeAbort();
      if (result.success) {
        // Refresh the repository state
        await loadBranches();
        await loadFileStatus();
      } else {
        setError(result.error || 'Failed to abort merge');
      }
    } catch (err) {
      setError(err.message || 'Error aborting merge');
      console.error('Error aborting merge:', err);
    } finally {
      stopLoading();
    }
  };

  // Update merge status when repo changes
  useEffect(() => {
    if (repoPath) {
      checkMergeInProgress();
    }
  }, [repoPath]);

  return (
    <div className="git-ui">
      <AppToolbar 
        showFooter={showFooter}
        onToggleFooter={() => setShowFooter(!showFooter)}
        onMergeAbort={handleMergeAbort}
        hasMergeInProgress={hasMergeInProgress}
      />
      <LoadingModal message={loadingMessage} />

      <div className="main-content">
        <div className="header-section">
          <div className="repository-selector">
            <button onClick={handleSelectRepository} disabled={loading} className="repo-btn">
              {repoPath ? 'Change Repository' : 'Select Repository'}
            </button>
            {repoPath && (
              <div className="repo-info">
                <span className="repo-path">{repoPath}</span>
                <span className="merge-warning" title={mergeStatus.message}>
                    ⚠️ {mergeStatus.message}
                  </span>
                {/* {hasMergeInProgress && (
                  <span className="merge-warning" title={mergeStatus.message}>
                    ⚠️ {mergeStatus.message}
                  </span>
                )} */}
              </div>
            )}
          </div>
        </div>

        {repoPath && (
          <Toolbar
            onFetch={handleFetch}
            onPush={handlePush}
            onCommit={handleCommit}
            loading={loading}
          />
        )}

        <div className="view-toggle">
          <button
            className={`view-btn ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            Main View
          </button>
          <button
            className={`view-btn ${activeTab === 'graph' ? 'active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            Graph View
          </button>
          <button
            className={`view-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            File Status
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {repoPath && (
          <>
            {activeTab === 'main' && (
              <>
                <div className="create-branch">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="New branch name"
                    disabled={loading}
                  />
                  <button onClick={handleCreateBranch} disabled={loading}>
                    Create Branch
                  </button>
                </div>

                <div className="branch-list">
                  <div className="branch-list-header">
                    <h3>Branches: {currentBranch}</h3>
                    <RefreshButton
                      onClick={loadBranches}
                      disabled={loading}
                      title="Refresh branches"
                      text="Branch Refresh"
                    />
                  </div>
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : (
                    <>
                      <div className="branch-section">
                        <h4>Local Branches</h4>
                        <ul>
                          {branches.map((branch) => (
                            <li key={branch}>
                              <span>{branch}</span>
                              <div className="branch-actions">
                                <button onClick={() => handleCheckout(branch)}>Checkout</button>
                                <button onClick={() => handleDelete(branch)}>Delete</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="branch-section">
                        <h4>Remote Branches</h4>
                        <ul>
                          {remoteBranches.map((branch) => (
                            <li key={branch}>
                              <span>{branch}</span>
                              <div className="branch-actions">
                                <button onClick={() => handleCheckout(branch)}>Checkout</button>
                                <button onClick={() => handleDeleteRemote(branch)}>Delete</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {activeTab === 'graph' && <GitGraph repoPath={repoPath} />}

            {activeTab === 'files' && (
              <FileStatus
                fileStatus={fileStatus}
                onStageFile={handleStageFile}
                onUnstageFile={handleUnstageFile}
                getStatusIcon={getStatusIcon}
                getStatusText={getStatusText}
                onRefresh={loadFileStatus}
                loading={loading}
                loadingMessage={loadingMessage}
              />
            )}
          </>
        )}
      </div>

      {showFooter && (
        <FooterArea 
          commandHistory={commandHistory}
          onClearHistory={handleClearHistory}
        />
      )}
    </div>
  );
}; 