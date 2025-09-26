import React from 'react';
import './AppToolbar.css';

export const AppToolbar = ({ showFooter, onToggleFooter, onMergeAbort, hasMergeInProgress = false }) => {
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
      </div>
    </div>
  );
}; 