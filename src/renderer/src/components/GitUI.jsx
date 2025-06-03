import React, { useState, useEffect } from 'react';
import { LoadingModal } from './LoadingModal';
import { GitGraph } from './GitGraph';
import { Toolbar } from './Toolbar';
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
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const [pruneBranches, setPruneBranches] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [forcePush, setForcePush] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [currentBranch, setCurrentBranch] = useState('');
  const [fileStatus, setFileStatus] = useState([]);
  const [view, setView] = useState('main'); // 'main' or 'graph'

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

  return (
    <div className="git-ui">
      <LoadingModal message={loadingMessage} />
      
      <div className="header-section">
        <h2>Git Branch Manager</h2>
        <div className="repository-selector">
          <button onClick={handleSelectRepository} disabled={loading} className="repo-btn">
            {repoPath ? 'Change Repository' : 'Select Repository'}
          </button>
          {repoPath && <span className="repo-path">{repoPath}</span>}
        </div>
      </div>
      
      {repoPath && (
        <Toolbar 
          onFetch={handleFetch}
          onPush={handlePush}
          onCommit={handleCommit}
          onRefresh={loadFileStatus}
          loading={loading}
        />
      )}
      
      <div className="view-toggle">
        <button 
          className={`view-btn ${view === 'main' ? 'active' : ''}`}
          onClick={() => setView('main')}
        >
          Main View
        </button>
        <button 
          className={`view-btn ${view === 'graph' ? 'active' : ''}`}
          onClick={() => setView('graph')}
        >
          Graph View
        </button>
      </div>

      {view === 'main' ? (
        <>
          <div className="command-history">
            <div className="command-history-header">
              <h3>Command History</h3>
              <button onClick={handleClearHistory} className="clear-history-btn">
                Clear History
              </button>
            </div>
            <div className="command-list">
              {commandHistory.slice().reverse().map((command, index) => (
                <div key={commandHistory.length - 1 - index} className="command-item">
                  <span className="command-number">{commandHistory.length - index}.</span>
                  <span className="command-text">{command}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {repoPath && (
            <>
              <div className="file-status-panel">
                <div className="file-status-section">
                  <h3>Working Directory</h3>
                  <div className="file-list">
                    {fileStatus
                      .filter(file => !file.isStaged)
                      .map((file, index) => (
                        <div key={`working-${index}`} className="file-item">
                          <span className="file-icon">{getStatusIcon(file)}</span>
                          <div className="file-info">
                            <span className="file-name">{file.file}</span>
                            <span className="file-status">{getStatusText(file)}</span>
                          </div>
                          <button
                            onClick={() => handleStageFile(file.file)}
                            className="stage-btn"
                            title="Stage file"
                          >
                            ➜
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="file-status-section">
                  <h3>Staging Area</h3>
                  <div className="file-list">
                    {fileStatus
                      .filter(file => file.isStaged)
                      .map((file, index) => (
                        <div key={`staged-${index}`} className="file-item">
                          <span className="file-icon">{getStatusIcon(file)}</span>
                          <div className="file-info">
                            <span className="file-name">{file.file}</span>
                            <span className="file-status">{getStatusText(file)}</span>
                          </div>
                          <button
                            onClick={() => handleUnstageFile(file.file)}
                            className="unstage-btn"
                            title="Unstage file"
                          >
                            ⬅
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

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
                  <button onClick={loadBranches} disabled={loading} className="refresh-btn">
                    ↻ Refresh
                  </button>
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
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {showCommitDialog && (
                <div className="dialog-overlay">
                  <div className="dialog">
                    <h3>Commit Changes</h3>
                    <div className="dialog-content">
                      <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Enter commit message..."
                        className="commit-message-input"
                        rows={4}
                      />
                    </div>
                    <div className="dialog-buttons">
                      <button onClick={() => setShowCommitDialog(false)} className="cancel-btn">
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleCommit(commitMessage)} 
                        disabled={loading || !commitMessage.trim()} 
                        className="confirm-btn"
                      >
                        Commit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {showFetchDialog && (
            <div className="dialog-overlay">
              <div className="dialog">
                <h3>Fetch Options</h3>
                <div className="dialog-content">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={pruneBranches}
                      onChange={(e) => setPruneBranches(e.target.checked)}
                    />
                    Prune tracking branches no longer present on remote(s)
                  </label>
                </div>
                <div className="dialog-buttons">
                  <button onClick={() => setShowFetchDialog(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={() => handleFetch(pruneBranches)} disabled={loading} className="confirm-btn">
                    Fetch
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPushDialog && (
            <div className="dialog-overlay">
              <div className="dialog">
                <h3>Push Options</h3>
                <div className="dialog-content">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={forcePush}
                      onChange={(e) => setForcePush(e.target.checked)}
                    />
                    Force Push
                  </label>
                  {forcePush && (
                    <div className="warning-message">
                      ⚠️ Warning: Force push will overwrite remote changes. Use with caution!
                    </div>
                  )}
                </div>
                <div className="dialog-buttons">
                  <button onClick={() => setShowPushDialog(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={() => handlePush(forcePush)} disabled={loading} className="confirm-btn">
                    Push
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        repoPath && <GitGraph repoPath={repoPath} />
      )}
    </div>
  );
}; 