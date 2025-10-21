import React from 'react';
import './LeftSideBar.css';

const LeftSideBar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'main', label: 'Branch View' },
    { id: 'graph', label: 'Graph View' },
    { id: 'files', label: 'File Status' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-scroll">
        <div className="logo">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M2.6 10.59L8.38 4.8l1.69 1.7c-.24.85.15 1.78.93 2.23v5.54c-.82.18-1.5.9-1.5 1.81 0 1 1.07 1.79 2.5 1.91V19h-2v2h4v-1.17c1.16-.41 2-1.52 2-2.83 0-1.09-.59-2.04-1.46-2.56l.15-.68-5.42-5.43-4.05 4.05-1.41-1.41M13 15.5c0 .53.4.95.9.97l.65 1.53H11v-1.5h2m-1-12h-1V2h-2v2h-1c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h5c1.1 0 2-.9 2-2V7.5c0-1.1-.9-2-2-2m0 13h-5V7.5h5V18z" />
          </svg>
          <span>Git UI</span>
        </div>
        <nav className="menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default LeftSideBar;
