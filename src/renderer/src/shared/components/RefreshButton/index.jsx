import React from 'react';
import './RefreshButton.css';

export const RefreshButton = ({ 
  onClick, 
  disabled, 
  title, 
  text 
}) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className="refresh-button"
      title={title}
    >
      <span className="refresh-icon">🔄</span>
      <span className="refresh-text">{text}</span>
    </button>
  );
}; 