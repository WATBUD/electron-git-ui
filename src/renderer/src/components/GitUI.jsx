import React, { useState, useEffect } from 'react';
import { LoadingModal } from './LoadingModal';
import './GitUI.css';

export const GitUI = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState(null);
  const [repoPath, setRepoPath] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const [pruneBranches, setPruneBranches] = useState(false);

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

  const handleFetch = async () => {
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
      setShowFetchDialog(false);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching:', err);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    if (repoPath) {
      loadBranches();
    }
  }, [repoPath]);

  return (
    <div className="git-ui">
      <LoadingModal message={loadingMessage} />
      
      <h2>Git Branch Manager</h2>
      
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

      <div className="repository-selector">
        <button onClick={handleSelectRepository} disabled={loading}>
          {repoPath ? 'Change Repository' : 'Select Repository'}
        </button>
        {repoPath && <span className="repo-path">{repoPath}</span>}
      </div>

      {error && <div className="error">{error}</div>}

      {repoPath && (
        <>
          <div className="action-buttons">
            <button onClick={() => setShowFetchDialog(true)} className="fetch-btn">
              Fetch
            </button>
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
              <h3>Branches</h3>
              <button onClick={loadBranches} disabled={loading} className="refresh-btn">
                ↻ Refresh
              </button>
            </div>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
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
            )}
          </div>
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
              <button onClick={handleFetch} disabled={loading} className="confirm-btn">
                Fetch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 