import React, { useState } from 'react';
import { message } from 'antd';
import { Copy } from 'lucide-react';
import './BranchList.css';

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
  setNewBranchName,
  createBranchByNewBranchName,
  handleCreateFromBranchWithPrefix
}) => {
  const sortBranches = (branches) => {
    return [...branches]
      .filter(branch => 
        searchTerm === '' || 
        branch.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (b === currentBranch) return 1;
        return a.localeCompare(b);
      });
  };

  const [copiedBranch, setCopiedBranch] = useState(null);
  const [branchPrefix, setBranchPrefix] = useState('promote-prod/,promote-stg2601/');
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopyBranchName = (branch) => {
    const branchName = branch.replace('refs/heads/', '');
    navigator.clipboard.writeText(branchName).then(() => {
      setCopiedBranch(branch);
      setTimeout(() => setCopiedBranch(null), 2000);
    });
  };




  return (
    <div className="branch-management">
      <div className="branch-prefix">
        <input
          type="text"
          value={branchPrefix}
          onChange={(e) => setBranchPrefix(e.target.value)}
          placeholder="Branch prefix (e.g., t1-)"
          className="prefix-input"
        />
      </div>
      <div className="create-branch">
        <button 
          onClick={() => {
            const fullBranchName = branchPrefix ? `${branchPrefix}${newBranchName}` : newBranchName;
            setNewBranchName({ target: { value: fullBranchName } });
            createBranchByNewBranchName();
          }}
          disabled={loading || !newBranchName.trim()}
          className="create-btn"
        >
          Create Branch
        </button>
      </div>

      <div className="branch-list">
        <div className="search-branches">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search branches..."
            className="search-input"
          />
        </div>
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

        <div className="branch-list-container">
          {loading ? (
            <div className="loading">Loading branches...</div>
          ) : (
            <>
              <div className="branch-section">
                <h4>Local Branches</h4>
                <ul>
                  {sortBranches(branches).map((branch) => (
                    <li
                      key={`local-${branch}`}
                      onDoubleClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          branch !== currentBranch && onCheckout(branch);
                        }
                      }}
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
                          className={`copy-button ${copiedBranch === branch ? 'copied' : ''}`}
                          title="Copy branch name"
                        >
                          <Copy size={14} />
                          {copiedBranch === branch && <span className="copied-text">Copied!</span>}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();  
                            const branchName = branch.replace('refs/heads/', '');
                            const lastPart = branchName.split('/').pop();
                            const branchNames = branchPrefix 
                              ? branchPrefix.split(',').map(prefix => `${prefix.trim()}${lastPart}`)
                              : [lastPart];
                            handleCreateFromBranchWithPrefix(branchNames.join(','));
                          }}
                          className="create-from-btn"
                          title={`Create branch from ${branch.split('/').pop()} with prefix ${branchPrefix}`}
                        >
                          Create from with prefix
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(branch);
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

              {remoteBranches.length > 0 && (
                <div className="branch-section">
                  <h4>Remote Branches</h4>
                  <ul>
                    {sortBranches(remoteBranches).map((branch) => (
                      <li
                        key={`remote-${branch}`}
                        onDoubleClick={(e) => {
                          if (e.target.tagName !== 'BUTTON') {
                            branch !== currentBranch && onCheckout(branch);
                          }
                        }}
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
                            className={`copy-button ${copiedBranch === branch ? 'copied' : ''}`}
                            title="Copy branch name"
                          >
                            <Copy size={14} />
                            {copiedBranch === branch && <span className="copied-text">Copied!</span>}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRemote(branch);
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchList;
