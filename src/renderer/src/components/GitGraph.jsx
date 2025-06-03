import React, { useState, useEffect } from 'react';
import './GitGraph.css';

export const GitGraph = ({ repoPath }) => {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentHead, setCurrentHead] = useState(null);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [unpushedCount, setUnpushedCount] = useState(0);

  const loadCommitHistory = async () => {
    if (!repoPath) return;
    try {
      setLoading(true);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.getCommitHistory();
      if (result.success) {
        setCommits(result.commits);
        setCurrentHead(result.currentHead);
        setCurrentBranch(result.currentBranch);
        setUnpushedCount(result.unpushedCount || 0);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading commit history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutCommit = async (commitHash) => {
    try {
      setLoading(true);
      setError(null);
      if (!window.git) {
        throw new Error('Git API not initialized');
      }
      const result = await window.git.checkoutCommit(commitHash);
      if (result.success) {
        await loadCommitHistory();
      } else {
        throw new Error(result.error || 'Failed to checkout commit');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error checking out commit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoPath) {
      loadCommitHistory();
    }
  }, [repoPath]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="git-graph">
      <div className="graph-header">
        <div className="graph-header-left">
          <h3>
            Commit History
            {unpushedCount > 0 && (
              <span className="unpushed-badge" title={`${unpushedCount} commits not pushed`}>
                {unpushedCount}
              </span>
            )}
          </h3>
          {currentBranch && (
            <span className="current-branch">
              {currentBranch}
            </span>
          )}
        </div>
        <button onClick={loadCommitHistory} className="refresh-btn" disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading commit history...</div>
      ) : (
        <div className="commit-list">
          {commits.map((commit, index) => (
            <div 
              key={commit.hash} 
              className={`commit-item ${commit.isCurrent ? 'current-commit' : ''}`}
            >
              <div className="commit-graph">
                {commit.branches.map((branch, i) => (
                  <div key={i} className={`branch-line ${branch === 'current' ? 'current' : ''}`} />
                ))}
                <div className={`commit-node ${commit.isCurrent ? 'current' : ''}`} />
              </div>
              <div className="commit-info">
                <div className="commit-header">
                  <span className="commit-hash">{commit.hash.substring(0, 7)}</span>
                  {commit.currentBranch && (
                    <span className="commit-branch">{commit.currentBranch}</span>
                  )}
                  {commit.isCurrent && (
                    <span className="current-tag">Current</span>
                  )}
                  {commit.isUnpushed && (
                    <span className="unpushed-tag">Unpushed</span>
                  )}
                </div>
                <div className="commit-message">{commit.message}</div>
                <div className="commit-meta">
                  <span className="commit-author">{commit.author}</span>
                  <span className="commit-date">{formatDate(commit.date)}</span>
                  <button
                    onClick={() => handleCheckoutCommit(commit.hash)}
                    className="checkout-btn"
                    disabled={commit.isCurrent}
                  >
                    Checkout
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 