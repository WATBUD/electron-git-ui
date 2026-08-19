/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { ModalPortal } from '../../../../shared/components/ModalPortal'
import { CopyButton } from '../../../../shared/components/CopyButton'
import { fetchUserConfig, setUserConfig } from '../../store/git'
import { CommitDialog } from '../Commit'
import styles from './Toolbar.module.css'
import {
  Download,
  RefreshCw,
  Upload,
  GitCommit,
  AlertTriangle,
  Folder,
  Archive,
  User
} from 'lucide-react'

export const Toolbar = ({ onPull, onFetch, onPush, onCommit, onStash, loading }) => {
  const dispatch = useDispatch()
  const [showFetchDialog, setShowFetchDialog] = useState(false)
  const [showPushDialog, setShowPushDialog] = useState(false)
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [showStashDialog, setShowStashDialog] = useState(false)
  const [pruneBranches, setPruneBranches] = useState(false)
  const [forcePush, setForcePush] = useState(false)
  const [includeStaged, setIncludeStaged] = useState(true)
  const [commitAndPush, setCommitAndPush] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [stashMessage, setStashMessage] = useState('')
  const [showAuthorEditor, setShowAuthorEditor] = useState(false)
  const [authorDraft, setAuthorDraft] = useState({ name: '', email: '' })
  const [authorSaving, setAuthorSaving] = useState(false)
  const authorRef = useRef(null)

  // Get Redux state
  const repoPath = useSelector((state) => state.git.repoPath)
  const currentBranch = useSelector((state) => state.git.currentBranch)
  const userConfig = useSelector((state) => state.git.userConfig)

  useEffect(() => {
    if (repoPath) dispatch(fetchUserConfig())
  }, [repoPath, dispatch])

  useEffect(() => {
    const handleOpenCommit = (e) => {
      setCommitMessage(e.detail.message || '')
      setShowCommitDialog(true)
    }
    window.addEventListener('open-commit-dialog', handleOpenCommit)
    return () => window.removeEventListener('open-commit-dialog', handleOpenCommit)
  }, [])

  useEffect(() => {
    if (!showAuthorEditor) {
      setAuthorDraft({
        name: userConfig?.name || '',
        email: userConfig?.email || ''
      })
    }
  }, [userConfig, showAuthorEditor])

  useEffect(() => {
    if (!showAuthorEditor) return
    const handleClickOutside = (e) => {
      if (authorRef.current && !authorRef.current.contains(e.target)) {
        setShowAuthorEditor(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAuthorEditor])

  const handleSaveAuthor = async () => {
    const name = (authorDraft.name || '').trim()
    const email = (authorDraft.email || '').trim()
    if (name === (userConfig?.name || '') && email === (userConfig?.email || '')) {
      setShowAuthorEditor(false)
      return
    }
    setAuthorSaving(true)
    try {
      await dispatch(setUserConfig({ name, email })).unwrap()
      setShowAuthorEditor(false)
    } catch (err) {
      console.error('Failed to update user config:', err)
    } finally {
      setAuthorSaving(false)
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

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    const message = commitMessage
    const shouldPush = commitAndPush
    try {
      // Do not continue to push when commit was rejected. Keeping the dialog
      // open also preserves the AI message so the user can fix the real error.
      await onCommit(message)
      if (shouldPush) {
        await onPush(false)
      }
      setCommitMessage('')
      setShowCommitDialog(false)
    } catch (error) {
      console.error('Commit & Push failed:', error)
    }
  }

  const handleStash = () => {
    onStash(includeStaged, stashMessage.trim() || undefined)
    setStashMessage('')
    setShowStashDialog(false)
  }

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
            {currentBranch && <span className={styles.branchName}>{currentBranch}</span>}
          </div>
        </div>
        <div className={styles.authorGroup} ref={authorRef}>
          <button
            type="button"
            className={styles.authorBtn}
            onClick={() => setShowAuthorEditor((prev) => !prev)}
            disabled={!repoPath}
            title={
              userConfig?.name || userConfig?.email
                ? `${userConfig?.name || ''} <${userConfig?.email || ''}>`
                : 'Set commit author'
            }
          >
            <User size={12} className={styles.authorIcon} />
            <span className={styles.authorName}>{userConfig?.name || 'Set author'}</span>
            {userConfig?.email && <span className={styles.authorEmail}>{userConfig.email}</span>}
          </button>

          {showAuthorEditor && (
            <div className={styles.authorPopover}>
              <div className={styles.authorField}>
                <label className={styles.authorLabel}>Name</label>
                <div className={styles.authorInputWrapper}>
                  <input
                    type="text"
                    className={styles.authorInput}
                    value={authorDraft.name}
                    placeholder="user.name"
                    autoFocus
                    onChange={(e) => setAuthorDraft((prev) => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveAuthor()
                      if (e.key === 'Escape') setShowAuthorEditor(false)
                    }}
                  />
                  <CopyButton
                    textToCopy={authorDraft.name || ''}
                    title="Copy name"
                    size={12}
                    className={styles.authorCopyBtn}
                  />
                </div>
              </div>
              <div className={styles.authorField}>
                <label className={styles.authorLabel}>Email</label>
                <div className={styles.authorInputWrapper}>
                  <input
                    type="email"
                    className={styles.authorInput}
                    value={authorDraft.email}
                    placeholder="user.email"
                    onChange={(e) => setAuthorDraft((prev) => ({ ...prev, email: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveAuthor()
                      if (e.key === 'Escape') setShowAuthorEditor(false)
                    }}
                  />
                  <CopyButton
                    textToCopy={authorDraft.email || ''}
                    title="Copy email"
                    size={12}
                    className={styles.authorCopyBtn}
                  />
                </div>
              </div>
              <div className={styles.authorActions}>
                <button
                  type="button"
                  className={styles.authorCancelBtn}
                  onClick={() => setShowAuthorEditor(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.authorSaveBtn}
                  onClick={handleSaveAuthor}
                  disabled={authorSaving}
                >
                  {authorSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
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

      <CommitDialog
        show={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onConfirm={handleCommit}
        loading={loading}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        commitAndPush={commitAndPush}
        setCommitAndPush={setCommitAndPush}
      />

      {showStashDialog && (
        <ModalPortal>
          <div className={styles.dialogOverlay} onClick={() => setShowStashDialog(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>Stash Options</h3>
              <div className={styles.dialogContent}>
                <input
                  type="text"
                  value={stashMessage}
                  onChange={(e) => setStashMessage(e.target.value)}
                  placeholder="Stash message (optional)..."
                  className={styles.stashMessageInput}
                  autoFocus
                />
                <label className={styles.checkboxLabel}>
                  <span>Also stash staged changes</span>
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
                    ? 'Staged and unstaged changes will be stashed together.'
                    : 'Only unstaged changes go into the stash. Staged changes stay in the index.'}
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
