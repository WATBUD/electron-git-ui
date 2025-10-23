import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Copy, Check } from 'lucide-react';
import './ErrorModal.css';

export const ErrorModal = ({ 
  error, 
  onClose,
  show = false
}) => {
  const [copied, setCopied] = useState(false);

  if (!show || !error) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setCopied(false);
    onClose?.();
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
            type="button"
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
          <button 
            className="error-modal-ok-btn" 
            onClick={handleClose}
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

ErrorModal.propTypes = {
  /** The error message to display */
  error: PropTypes.string,
  /** Callback when the modal is closed */
  onClose: PropTypes.func.isRequired,
  /** Controls the visibility of the modal */
  show: PropTypes.bool
};