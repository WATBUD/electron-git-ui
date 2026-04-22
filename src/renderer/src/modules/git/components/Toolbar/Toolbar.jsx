import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { ModalPortal } from '../../../../shared/components/ModalPortal'
import styles from './Toolbar.module.css'
import { Download, RefreshCw, Upload, GitCommit, AlertTriangle, Circle, Folder, Archive } from 'lucide-react'

export const Toolbar = ({ onPull, onFetch, onPush, onCommit, onStash, loading }) => {
  const [showFetchDialog, setShowFetchDialog] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [showStashDialog, setShowStashDialog] = useState(false)
  const [pruneBranches, setPruneBranches] = useState(false)
  const [forcePush, setForcePush] = useState(false)
  const [includeStaged, setIncludeStaged] = useState(true)
  const [commitMessage, setCommitMessage] = useState('')

  // Get Redux state
  const fileStatus = useSelector((state) => state.git.fileStatus || [])
  const repoPath = useSelector((state) => state.git.repoPath)
  const currentBranch = useSelector((state) => state.git.currentBranch)

  // Calculate Git status
  const getGitStatus = () => {
    if (!fileStatus || !Array.isArray(fileStatus) || fileStatus.length === 0) {
      return { type: 'clean', count: 0 }
    }
    
    let stagedCount = 0
    let modifiedCount = 0
    let untrackedCount = 0
    
    fileStatus.forEach(file => {
      if (file && file.statusType) {
        if (file.statusType.staged === 'M') stagedCount++
        if (file.statusType.working === 'M') modifiedCount++
        if (file.statusType.working === '??') untrackedCount++
      }
    })
    
    const totalChanges = stagedCount + modifiedCount + untrackedCount
    
    if (totalChanges === 0) {
      return { type: 'clean', count: 0 }
    } else if (untrackedCount > 0 || modifiedCount > 0) {
      return { type: 'dirty', count: totalChanges }
    } else {
      return { type: 'staged', count: totalChanges }
    }
  }

  const getStatusColor = (status) => {
    switch (status.type) {
      case 'clean':
        return '#22c55e'
      case 'staged':
        return '#3b82f6'
      case 'dirty':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getProjectName = (path) => {
    return path ? path.split(/[/\\]/).pop() : 'No Repository'
  }

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

  const handleStash = () => {
    onStash(includeStaged)
    setShowStashDialog(false)
  }

  const gitStatus = getGitStatus()
  const projectName = getProjectName(repoPath)

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
            <span className={styles.toolbarIcon}>
              <Download size={14} />
            </span>
            <span className={styles.toolbarText}>Pull</span>
          </button>
          <button
            onClick={() => setShowFetchDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Fetch from remote"
          >
            <span className={styles.toolbarIcon}>
              <RefreshCw size={14} />
            </span>
            <span className={styles.toolbarText}>Fetch</span>
          </button>
          <button
            onClick={() => setShowPushDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Push to remote"
          >
            <span className={styles.toolbarIcon}>
              <Upload size={14} />
            </span>
            <span className={styles.toolbarText}>Push</span>
          </button>
          <button
            onClick={() => setShowCommitDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Commit changes"
          >
            <span className={styles.toolbarIcon}>
              <GitCommit size={14} />
            </span>
            <span className={styles.toolbarText}>Commit</span>
          </button>
          <button
            onClick={() => setShowStashDialog(true)}
            className={styles.toolbarBtn}
            disabled={loading}
            title="Stash changes"
          >
            <span className={styles.toolbarIcon}>
              <Archive size={14} />
            </span>
            <span className={styles.toolbarText}>Stash</span>
          </button>
        </div>
        
        <div className={styles.statusGroup}>
          <div className={styles.projectInfo}>
            <Folder size={12} className={styles.projectIcon} />
            <span className={styles.projectName}>{projectName}</span>
            {currentBranch && (
              <span className={styles.branchName}>{currentBranch}</span>
            )}
          </div>
          {gitStatus.count > 0 && (
            <div 
              className={styles.statusIndicator}
              style={{ 
                backgroundColor: `${getStatusColor(gitStatus)}20`,
                borderColor: `${getStatusColor(gitStatus)}40`,
                color: getStatusColor(gitStatus)
              }}
            >
              <span className={styles.statusCount}>{gitStatus.count}</span>
            </div>
          )}
        </div>
      </div>

      {showFetchDialog && (
        <ModalPortal>
          <div className={styles.dialogOverlay} onClick={() => setShowFetchDialog(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>Fetch Options</h3>
              <div className={styles.dialogContent}>
                <label className={styles.checkboxLabel}>
                  <span>Prune remote branches</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="checkbox"
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                        zIndex: 1
                      }}
                      checked={pruneBranches}
                      onChange={(e) => setPruneBranches(e.target.checked)}
                    />
                    <div className={styles.toggleSwitch}></div>
                  </div>
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
          <div className={styles.dialogOverlay} onClick={() => setShowPushDialog(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>Push Options</h3>
              <div className={styles.dialogContent}>
                <label className={styles.checkboxLabel}>
                  <span>Force Push</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="checkbox"
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                        zIndex: 1
                      }}
                      checked={forcePush}
                      onChange={(e) => setForcePush(e.target.checked)}
                    />
                    <div className={styles.toggleSwitch}></div>
                  </div>
                </label>
                {forcePush && (
                  <div className={styles.warningMessage}>
                    <AlertTriangle
                      size={14}
                      style={{ marginRight: '8px', verticalAlign: 'middle' }}
                    />
                    Warning: Force push will overwrite remote changes. Use with caution!
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
          <div className={styles.dialogOverlay} onClick={() => setShowCommitDialog(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>Commit Changes</h3>
              <div className={styles.dialogContent}>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className={styles.commitMessageInput}
                  autoFocus
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

      {showStashDialog && (
        <ModalPortal>
          <div className={styles.dialogOverlay} onClick={() => setShowStashDialog(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>Stash Options</h3>
              <div className={styles.dialogContent}>
                <label className={styles.checkboxLabel}>
                  <span>Include staged changes</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="checkbox"
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                        zIndex: 1
                      }}
                      checked={includeStaged}
                      onChange={(e) => setIncludeStaged(e.target.checked)}
                    />
                    <div className={styles.toggleSwitch}></div>
                  </div>
                </label>
                <div className={styles.infoMessage}>
                  <AlertTriangle
                    size={14}
                    style={{ marginRight: '8px', verticalAlign: 'middle' }}
                  />
                  {includeStaged 
                    ? "All changes (staged and unstaged) will be stashed."
                    : "Only unstaged changes will be stashed. Staged changes will remain."
                  }
                </div>
              </div>
              <div className={styles.dialogButtons}>
                <button onClick={() => setShowStashDialog(false)} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button onClick={handleStash} disabled={loading} className={styles.confirmBtn}>
                  Stash
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

export default Toolbar
