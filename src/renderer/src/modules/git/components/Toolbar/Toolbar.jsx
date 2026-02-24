import React, { useState } from 'react'
import { ModalPortal } from '../../../../shared/components/ModalPortal'
import styles from './Toolbar.module.css'

export const Toolbar = ({ onPull, onFetch, onPush, onCommit, loading }) => {
  const [showFetchDialog, setShowFetchDialog] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [pruneBranches, setPruneBranches] = useState(false)
  const [forcePush, setForcePush] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')

  const handleFetch = () => {
    onFetch(pruneBranches)
    setShowFetchDialog(false)
  }

  const handlePush = () => {
    onPush(forcePush)
    setShowPushDialog(false)
  }

  const handleCommit = () => {
    if (commitMessage.trim()) {
      onCommit(commitMessage)
      setCommitMessage('')
      setShowCommitDialog(false)
    }
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            onClick={onPull}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Pull from remote"
          >
            <span className={styles.toolbarIcon}>⚓</span>
            <span className={styles.toolbarText}>Pull</span>
          </button>
          <button
            onClick={() => setShowFetchDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Fetch from remote"
          >
            <span className={styles.toolbarIcon}>⬇️</span>
            <span className={styles.toolbarText}>Fetch</span>
          </button>
          <button
            onClick={() => setShowPushDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Push to remote"
          >
            <span className={styles.toolbarIcon}>⬆️</span>
            <span className={styles.toolbarText}>Push</span>
          </button>
          <button
            onClick={() => setShowCommitDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Commit changes"
          >
            <span className={styles.toolbarIcon}>💾</span>
            <span className={styles.toolbarText}>Commit</span>
          </button>
        </div>
      </div>

      {showFetchDialog && (
        <ModalPortal>
          <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
              <h3>Fetch Options</h3>
              <div className={styles.dialogContent}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={pruneBranches}
                    onChange={(e) => setPruneBranches(e.target.checked)}
                  />
                  Prune tracking branches no longer present on remote(s)
                </label>
              </div>
              <div className={styles.dialogButtons}>
                <button onClick={() => setShowFetchDialog(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleFetch} disabled={loading} className={styles.confirmBtn}>
                  Fetch
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showPushDialog && (
        <ModalPortal>
          <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
              <h3>Push Options</h3>
              <div className={styles.dialogContent}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={forcePush}
                    onChange={(e) => setForcePush(e.target.checked)}
                  />
                  Force Push
                </label>
                {forcePush && (
                  <div className={styles.warningMessage}>
                    ⚠️ Warning: Force push will overwrite remote changes. Use with caution!
                  </div>
                )}
              </div>
              <div className={styles.dialogButtons}>
                <button onClick={() => setShowPushDialog(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handlePush} disabled={loading} className={styles.confirmBtn}>
                  Push
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showCommitDialog && (
        <ModalPortal>
          <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
              <h3>Commit Changes</h3>
              <div className={styles.dialogContent}>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className={styles.commitMessageInput}
                  rows={4}
                />
              </div>
              <div className={styles.dialogButtons}>
                <button onClick={() => setShowCommitDialog(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  disabled={loading || !commitMessage.trim()}
                  className={styles.confirmBtn}
                >
                  Commit
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}
