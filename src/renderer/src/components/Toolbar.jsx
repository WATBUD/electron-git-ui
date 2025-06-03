import React from 'react';
import './Toolbar.css';

export const Toolbar = ({ 
  onFetch, 
  onPush, 
  onCommit, 
  onRefresh,
  loading 
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button 
          onClick={onFetch} 
          className="toolbar-btn fetch-btn"
          disabled={loading}
          title="Fetch from remote"
        >
          <span className="toolbar-icon">⬇️</span>
          <span className="toolbar-text">Fetch</span>
        </button>
        <button 
          onClick={onPush} 
          className="toolbar-btn push-btn"
          disabled={loading}
          title="Push to remote"
        >
          <span className="toolbar-icon">⬆️</span>
          <span className="toolbar-text">Push</span>
        </button>
      </div>
      <div className="toolbar-group">
        <button 
          onClick={onCommit} 
          className="toolbar-btn commit-btn"
          disabled={loading}
          title="Commit changes"
        >
          <span className="toolbar-icon">💾</span>
          <span className="toolbar-text">Commit</span>
        </button>
        <button 
          onClick={onRefresh} 
          className="toolbar-btn refresh-btn"
          disabled={loading}
          title="Refresh status"
        >
          <span className="toolbar-icon">🔄</span>
          <span className="toolbar-text">Refresh</span>
        </button>
      </div>
    </div>
  );
}; 