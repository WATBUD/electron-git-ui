import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  refreshTags, 
  toggleFooter, 
  abortMerge,
  checkMergeInProgress
} from '../../store/gitSlice';
import './AppToolbar.css';

export const AppToolbar = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const menuRef = useRef(null);
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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

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
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showFooter}
              onChange={() => dispatch(toggleFooter())}
            />
            <span className="toggle-checkbox"></span>
            <span className="toggle-label">Show Footer</span>
          </label>
        </div>
      </div>
      
      <div className={`toolbar-menu ${activeMenu === 'merge' ? 'active' : ''}`} ref={menuRef}>
        <span 
          className="menu-label"
          onClick={() => toggleMenu('merge')}
        >
          Merge
        </span>
        <div className="menu-content">
          <button 
            className={`menu-item merge-abort-btn ${hasMergeInProgress ? 'active' : 'disabled'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleMergeAbort();
              setActiveMenu(null);
            }}
            disabled={!hasMergeInProgress}
            title={hasMergeInProgress ? 'Abort the current merge operation' : 'No merge in progress'}
          >
            Abort Merge
          </button>
        </div>
      </div>

      <div className={`toolbar-menu ${activeMenu === 'tags' ? 'active' : ''}`} ref={menuRef}>
        <span 
          className="menu-label"
          onClick={() => toggleMenu('tags')}
        >
          Tags
        </span>
        <div className="menu-content">
          <button 
            className={`menu-item refresh-tags-btn ${isRefreshingTags ? 'refreshing' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshTags();
              setActiveMenu(null);
            }}
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
