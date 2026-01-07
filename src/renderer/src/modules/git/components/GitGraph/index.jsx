import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  loadCommitHistory, 
  checkoutCommit, 
  mergeBranch,
} from '../../store/git';
import { RefreshButton } from '../../../../shared/components/RefreshButton';
import './GitGraph.css';

export const GitGraph = ({ repoPath }) => {
  const dispatch = useDispatch();
  const {
    commits,
    currentHead,
    currentBranch,
    unpushedCount,
  } = useSelector((state) => state.git);

  const [contextMenu, setContextMenu] = useState({ 
    show: false, 
    x: 0, 
    y: 0, 
    targetCommit: null 
  });
  const contextMenuRef = useRef(null);

  const handleCheckout = async (commitHash) => {
    await dispatch(checkoutCommit(commitHash));
  };

  const handleContextMenu = (e, commit) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      targetCommit: commit
    });
  };

  const handleMerge = async (sourceBranch) => {
    if (sourceBranch && sourceBranch !== currentBranch) {
      await dispatch(mergeBranch(sourceBranch));
      setContextMenu({ show: false, x: 0, y: 0, targetCommit: null });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ show: false, x: 0, y: 0, targetCommit: null });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (err) {
      console.error('Error formatting date:', dateStr, err);
      return dateStr;
    }
  };

  return (
    <div className="git-graph">
      <div className="graph-header">
        <div className="graph-header-left">
          <h3>
            {unpushedCount > 0 && (
              <span className="unpushed-badge" title={`${unpushedCount} commits not pushed`}>
                {unpushedCount}
              </span>
            )}
          </h3>
          {currentBranch && <span className="current-branch">{currentBranch}</span>}
        </div>
        <RefreshButton
          onClick={() => dispatch(loadCommitHistory())}
          title="Refresh commit history"
          text="Commit History Refresh"
        />
      </div>
      <div className="commit-list">
        {commits.map((commit, index) => (
          <div
            key={commit.hash}
            className={`commit-item ${commit.isCurrent ? 'current-commit' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, commit)}
          >
            <div className="commit-graph">
              {commit.branches.map((branch, i) => (
                <div key={i} className={`branch-line ${branch === 'current' ? 'current' : ''}`} />
              ))}
              <div className={`commit-node ${commit.isCurrent ? 'current' : ''}`} />
            </div>
            <div className="commit-info">
              <div className="commit-header">
                <div className="commit-hash-container">
                  <span className="commit-hash">{commit.hash.substring(0, 7)}</span>
                  {commit.branches.length > 0 && (
                    <div className="branch-tags">
                      {commit.branches.map((branch, i) => (
                        <span
                          key={i}
                          className={`branch-tag ${branch.startsWith('origin/') ? 'remote' : ''} ${branch.includes('HEAD') ? 'head' : ''}`}
                        >
                          {branch}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {commit.isCurrent && <span className="current-tag">Current</span>}
                {commit.isUnpushed && <span className="unpushed-tag">Unpushed</span>}
              </div>
              <div className="commit-message">{commit.message}</div>
              <div className="commit-meta">
                <span className="commit-author">{commit.author}</span>
                <span className="commit-date">{formatDate(commit.date)}</span>
                <button
                  onClick={() => handleCheckout(commit.hash)}
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

      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x
          }}
        >
          <div className="context-menu-header">
            Merge {contextMenu.targetCommit?.branches[0] || 'branch'} into {currentBranch}
          </div>
          <div className="context-menu-content">
            <button
              onClick={() => handleMerge(contextMenu.targetCommit?.branches[0])}
              disabled={
                !contextMenu.targetCommit?.branches[0] ||
                contextMenu.targetCommit?.branches[0] === currentBranch
              }
            >
              Merge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}; 