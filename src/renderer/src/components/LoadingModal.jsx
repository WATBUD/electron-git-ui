import React from 'react';
import './LoadingModal.css';

export const LoadingModal = ({ message }) => {
  if (!message) return null;

  return (
    <div className="loading-modal">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-message">{message}</div>
      </div>
    </div>
  );
}; 