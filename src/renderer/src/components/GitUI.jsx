import React, { useState, useEffect } from 'react';
import './GitUI.css';

export const GitUI = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState(null);
  const [repoPath, setRepoPath] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);

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

  const handleSelectRepository = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.selectRepository();
      if (result && result.success) {
        setRepoPath(result.path);
        await updateCommandHistory();
        await loadBranches();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error selecting repository:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    if (!repoPath) return;
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      setLoading(true);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.createBranch(newBranchName);
      if (result.success) {
        await updateCommandHistory();
        setNewBranchName('');
        await loadBranches();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error creating branch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (branchName) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleDelete = async (branchName) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  return (
    <div className="git-ui">
      <h2>Git Branch Manager</h2>
      
      <div className="command-history">
        <div className="command-history-header">
          <h3>Command History</h3>
          <button onClick={handleClearHistory} className="clear-history-btn">
            Clear History
          </button>
        </div>
        <div className="command-list">
          {commandHistory.map((command, index) => (
            <div key={index} className="command-item">
              <span className="command-number">{index + 1}.</span>
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
            <h3>Branches</h3>
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
    </div>
  );
}; 