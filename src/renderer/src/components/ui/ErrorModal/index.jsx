import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearError } from '../../../store/gitSlice';
import { Copy, Check } from 'lucide-react';
import './ErrorModal.css';

export const ErrorModal = () => {
  const dispatch = useDispatch();
  const error = useSelector((state) => state.git.error);
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const handleClose = () => {
    dispatch(clearError());
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="error-modal-overlay" onClick={handleClose}>
      <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-header">
          <h3>⚠️ Error</h3>
          <button 
            className={`copy-error-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy error message"
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
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