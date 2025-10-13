import React, { useState } from 'react';
import './AppToolbar.css';

export const AppToolbar = ({ showFooter, onToggleFooter, onMergeAbort, hasMergeInProgress = false, onRefreshTags }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshTags = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshTags();
    } catch (error) {
      console.error('Error refreshing tags:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  return (
    <div className="app-toolbar">
      <div className="toolbar-section">
        <div className="toolbar-menu">
          <span className="menu-label">View</span>
          <div className="menu-content">
            <label className="menu-item">
              <input
                type="checkbox"
                checked={showFooter}
                onChange={onToggleFooter}
              />
              <span>Show Footer</span>
            </label>
          </div>
        </div>
        
        <div className="toolbar-menu">
          <span className="menu-label">Merge</span>
          <div className="menu-content">
            <button 
              className={`menu-item merge-abort-btn ${hasMergeInProgress ? 'active' : 'disabled'}`}
              onClick={hasMergeInProgress ? onMergeAbort : null}
              disabled={!hasMergeInProgress}
              title={hasMergeInProgress ? 'Abort the current merge operation' : 'No merge in progress'}
            >
              Abort
            </button>
          </div>
        </div>

        <div className="toolbar-menu">
          <span className="menu-label">Tags</span>
          <div className="menu-content">
            <button 
              className={`menu-item refresh-tags-btn ${isRefreshing ? 'disabled' : ''}`}
              onClick={handleRefreshTags}
              disabled={isRefreshing}
              title="Clear local tags and fetch latest from remote"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Tags'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 