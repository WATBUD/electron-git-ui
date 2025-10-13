import React from 'react';
import { message } from 'antd';
import '../styles/BranchList.css';

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
  onBranchNameChange,
  onCreateBranch
}) => {
  const sortBranches = (branches) => {
    return [...branches].sort((a, b) => {
      if (a === currentBranch) return -1;
      if (b === currentBranch) return 1;
      return a.localeCompare(b);
    });
  };

  const handleCopyBranchName = (branchName) => {
    navigator.clipboard.writeText(branchName);
    message.success(`Copied: ${branchName}`);
  };

  const renderBranchSection = (title, branches, isRemote = false) => {
    const sortedBranches = sortBranches(branches);
    return (
      <div className="branch-section">
        <h4>{title}</h4>
        <div className="branch-list-container">
          <ul>
            {sortedBranches.map((branch) => (
            <li 
              key={`${isRemote ? 'remote' : 'local'}-${branch}`}
              onDoubleClick={() => branch !== currentBranch && onCheckout(branch)}
              className={`${branch === currentBranch ? 'active-branch' : 'clickable-branch'} no-select`}
              title={branch === currentBranch ? 'Current branch' : 'Double-click to checkout'}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span>
                {branch}
                {branch === currentBranch && <span className="current-branch-indicator"> (current)</span>}
              </span>
              <div className="branch-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyBranchName(branch);
                  }}
                  className="copy-btn"
                  title="Copy branch name"
                >
                  Copy
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    isRemote ? onDeleteRemote(branch) : onDelete(branch);
                  }}
                  className="delete-btn"
                  title="Delete branch"
                >
                  Delete
                </button>
              </div>
            </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="branch-management">
      <div className="create-branch">
        <input
          type="text"
          value={newBranchName}
          onChange={onBranchNameChange}
          placeholder="New branch name"
          disabled={loading}
        />
        <button 
          onClick={onCreateBranch} 
          disabled={loading || !newBranchName.trim()}
          className="create-btn"
        >
          Create Branch
        </button>
      </div>

      <div className="branch-list">
        <div className="branch-list-header">
          <h3>Branches: <span className="current-branch">{currentBranch}</span></h3>
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="refresh-btn"
            title="Refresh branches"
          >
            Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="loading">Loading branches...</div>
        ) : (
          <>
            {renderBranchSection('Local Branches', branches, false)}
            {remoteBranches.length > 0 && renderBranchSection('Remote Branches', remoteBranches, true)}
          </>
        )}
      </div>
    </div>
  );
};

export default BranchList;
