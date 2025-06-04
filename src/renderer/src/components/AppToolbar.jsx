import React from 'react';
import './AppToolbar.css';

export const AppToolbar = ({ showFooter, onToggleFooter }) => {
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
      </div>
    </div>
  );
}; 