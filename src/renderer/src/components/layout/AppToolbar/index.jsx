import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  refreshTags, 
  toggleFooter, 
  abortMerge,
  checkMergeInProgress
} from '../../../store/gitSlice';
import './AppToolbar.css';

export const AppToolbar = () => {
  const dispatch = useDispatch();
  const { 
    showFooter, 
    isRefreshingTags, 
    hasMergeInProgress
  } = useSelector((state) => ({
    showFooter: state.git.showFooter,
    isRefreshingTags: state.git.isRefreshingTags,
    hasMergeInProgress: state.git.hasMergeInProgress
  }));

  const handleRefreshTags = () => {
    if (isRefreshingTags) return;
    dispatch(refreshTags());
  };

  const handleMergeAbort = () => {
    if (hasMergeInProgress) {
      dispatch(abortMerge())
        .then(() => dispatch(checkMergeInProgress()));
    }
  };

  return (
    <div className="app-toolbar">
      <div className="toolbar-section">
        <div className="toolbar-menu">
          <label className="menu-item">
            <input
              type="checkbox"
              checked={showFooter}
              onChange={() => dispatch(toggleFooter())}
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
            onClick={handleMergeAbort}
            disabled={!hasMergeInProgress}
            title={hasMergeInProgress ? 'Abort the current merge operation' : 'No merge in progress'}
          >
            Abort Merge
          </button>
        </div>
      </div>

      <div className="toolbar-menu">
        <span className="menu-label">Tags</span>
        <div className="menu-content">
          <button 
            className={`menu-item refresh-tags-btn ${isRefreshingTags ? 'refreshing' : ''}`}
            onClick={handleRefreshTags}
            disabled={isRefreshingTags}
            title="Refresh tags from remote"
          >
            {isRefreshingTags ? 'Refreshing...' : 'Refresh Tags'}
          </button>
        </div>
      </div>
    </div>
  );
};
