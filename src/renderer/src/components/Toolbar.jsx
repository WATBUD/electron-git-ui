import React, { useState } from 'react';
import { ModalPortal } from './ModalPortal';
import './Toolbar.css';

export const Toolbar = ({ 
  onFetch, 
  onPush, 
  onCommit, 
  onRefresh,
  loading 
}) => {
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [pruneBranches, setPruneBranches] = useState(false);
  const [forcePush, setForcePush] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const handleFetch = () => {
    onFetch(pruneBranches);
    setShowFetchDialog(false);
  };

  const handlePush = () => {
    onPush(forcePush);
    setShowPushDialog(false);
  };

  const handleCommit = () => {
    if (commitMessage.trim()) {
      onCommit(commitMessage);
      setCommitMessage('');
      setShowCommitDialog(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-group">
          <button 
            onClick={() => setShowFetchDialog(true)} 
            className="toolbar-btn fetch-btn"
            disabled={loading}
            title="Fetch from remote"
          >
            <span className="toolbar-icon">⬇️</span>
            <span className="toolbar-text">Fetch</span>
          </button>
          <button 
            onClick={() => setShowPushDialog(true)} 
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
            onClick={() => setShowCommitDialog(true)} 
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

      {showFetchDialog && (
        <ModalPortal>
          <div className="dialog-overlay">
            <div className="dialog">
              <h3>Fetch Options</h3>
              <div className="dialog-content">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pruneBranches}
                    onChange={(e) => setPruneBranches(e.target.checked)}
                  />
                  Prune tracking branches no longer present on remote(s)
                </label>
              </div>
              <div className="dialog-buttons">
                <button onClick={() => setShowFetchDialog(false)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={handleFetch} disabled={loading} className="confirm-btn">
                  Fetch
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showPushDialog && (
        <ModalPortal>
          <div className="dialog-overlay">
            <div className="dialog">
              <h3>Push Options</h3>
              <div className="dialog-content">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={forcePush}
                    onChange={(e) => setForcePush(e.target.checked)}
                  />
                  Force Push
                </label>
                {forcePush && (
                  <div className="warning-message">
                    ⚠️ Warning: Force push will overwrite remote changes. Use with caution!
                  </div>
                )}
              </div>
              <div className="dialog-buttons">
                <button onClick={() => setShowPushDialog(false)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={handlePush} disabled={loading} className="confirm-btn">
                  Push
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showCommitDialog && (
        <ModalPortal>
          <div className="dialog-overlay">
            <div className="dialog">
              <h3>Commit Changes</h3>
              <div className="dialog-content">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className="commit-message-input"
                  rows={4}
                />
              </div>
              <div className="dialog-buttons">
                <button onClick={() => setShowCommitDialog(false)} className="cancel-btn">
                  Cancel
                </button>
                <button 
                  onClick={handleCommit} 
                  disabled={loading || !commitMessage.trim()} 
                  className="confirm-btn"
                >
                  Commit
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}; 