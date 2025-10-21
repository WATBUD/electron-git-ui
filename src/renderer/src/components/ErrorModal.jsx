import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError } from '../store/gitSlice';
import './ErrorModal.css';

export const ErrorModal = () => {
  const dispatch = useDispatch();
  const error = useSelector((state) => state.git.error);

  if (!error) return null;

  const handleClose = () => {
    dispatch(clearError());
  };

  return (
    <div className="error-modal-overlay" onClick={handleClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-header">
          <h3>⚠️ Error</h3>
        </div>
        <div className="error-modal-body">
          <pre className="error-message">{error}</pre>
        </div>
        <div className="error-modal-footer">
          <button className="error-modal-ok-btn" onClick={handleClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
