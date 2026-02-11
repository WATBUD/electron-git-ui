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
