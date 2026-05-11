import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  toggleFooter,
  abortMerge,
  checkMergeInProgress,
  getCachedDiff,
  clearCachedDiff,
  addPrefix,
  removePrefix,
  toggleSelectedPrefix,
  fetchUserConfig,
  setUserConfig
} from '../../store/git'
import { DiffModal } from '../../../../shared/components/DiffModal'
import { CopyButton } from '../../../../shared/components/CopyButton'
import styles from './AppToolbar.module.css'
import { Trash2, Plus, Check, Eye, GitMerge, Type, Clock, User } from 'lucide-react'
import { CustomTooltip } from '../../../../shared/components/CustomTooltip'

const PrefixItem = React.memo(({ prefix, onRemove }) => {
  const isSelected = useSelector((state) => (state.git.selectedPrefixes || []).includes(prefix))
  const dispatch = useDispatch()

  return (
    <div
      className={styles.prefixItem}
      onClick={(e) => {
        e.stopPropagation()
        dispatch(toggleSelectedPrefix(prefix))
      }}
    >
      <div className={styles.prefixCheckRow}>
        <div className={`${styles.customCheckbox} ${isSelected ? styles.checked : ''}`}>
          {isSelected && <Check size={12} />}
        </div>
        <span className={styles.prefixText}>{prefix}</span>
      </div>
      <div className={styles.prefixActions}>
        <CustomTooltip title="Copy prefix">
          <CopyButton textToCopy={prefix} size={12} showCopiedText={false} />
        </CustomTooltip>
        <button
          className={styles.removeBtn}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(prefix)
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
})

const PrefixList = React.memo(({ onRemove }) => {
  const prefixes = useSelector((state) => state.git.prefixes || [])

  return (
    <div className={styles.prefixList}>
      {prefixes.map((prefix) => (
        <PrefixItem key={prefix} prefix={prefix} onRemove={onRemove} />
      ))}
    </div>
  )
})

export const AppToolbar = () => {
  const [activeMenu, setActiveMenu] = useState(null)
  const mergeMenuRef = useRef(null)
  const viewMenuRef = useRef(null)
  const prefixMenuRef = useRef(null)
  const authorMenuRef = useRef(null)
  const [newPrefix, setNewPrefix] = useState('')
  const dispatch = useDispatch()
  const showFooter = useSelector((state) => state.git.showFooter)
  const hasMergeInProgress = useSelector((state) => state.git.hasMergeInProgress)
  const cachedDiff = useSelector((state) => state.git.cachedDiff)
  const userConfig = useSelector((state) => state.git.userConfig)
  const repoPath = useSelector((state) => state.git.repoPath)
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [authorDraft, setAuthorDraft] = useState({ name: '', email: '' })
  const [authorSaving, setAuthorSaving] = useState(false)

  // Refresh author when the repo changes.
  useEffect(() => {
    if (repoPath) dispatch(fetchUserConfig())
  }, [repoPath, dispatch])

  // Sync draft with the latest fetched config (unless the author menu is open
  // and the user is mid-edit).
  useEffect(() => {
    if (activeMenu !== 'author') {
      setAuthorDraft({
        name: userConfig?.name || '',
        email: userConfig?.email || ''
      })
    }
  }, [userConfig, activeMenu])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        mergeMenuRef.current &&
        !mergeMenuRef.current.contains(event.target) &&
        viewMenuRef.current &&
        !viewMenuRef.current.contains(event.target) &&
        prefixMenuRef.current &&
        !prefixMenuRef.current.contains(event.target) &&
        authorMenuRef.current &&
        !authorMenuRef.current.contains(event.target)
      ) {
        setActiveMenu(null)
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mergeMenuRef, viewMenuRef, prefixMenuRef, authorMenuRef])

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const handleMergeAbort = () => {
    if (hasMergeInProgress) {
      dispatch(abortMerge()).then(() => dispatch(checkMergeInProgress()))
    }
  }

  const handleShowDiff = () => {
    dispatch(getCachedDiff())
    setShowDiffModal(true)
    setActiveMenu(null)
  }

  const handleCloseDiff = () => {
    setShowDiffModal(false)
    dispatch(clearCachedDiff())
  }

  const handleAddPrefix = (e) => {
    e.preventDefault()
    if (newPrefix.trim()) {
      dispatch(addPrefix(newPrefix.trim()))
      setNewPrefix('')
    }
  }

  const handleRemovePrefix = React.useCallback(
    (prefix) => {
      dispatch(removePrefix(prefix))
    },
    [dispatch]
  )

  const handleSaveAuthor = async () => {
    const name = (authorDraft.name || '').trim()
    const email = (authorDraft.email || '').trim()
    if (name === (userConfig?.name || '') && email === (userConfig?.email || '')) {
      setActiveMenu(null)
      return
    }
    setAuthorSaving(true)
    try {
      await dispatch(setUserConfig({ name, email })).unwrap()
      setActiveMenu(null)
    } catch (err) {
      console.error('Failed to update user config:', err)
    } finally {
      setAuthorSaving(false)
    }
  }

  return (
    <div className={styles.appToolbar}>
      <div className={styles.toolbarSection}>
        <div className={styles.toolbarMenu}>
          <label className={styles.toggleSwitch}>
            <input type="checkbox" checked={showFooter} onChange={() => dispatch(toggleFooter())} />
            <span className={styles.toggleCheckbox}></span>
            <div className={styles.toggleLabelContainer}>
              <Clock size={14} />
              <span className={styles.toggleLabel}>History</span>
            </div>
          </label>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'view' ? styles.active : ''}`}
        ref={viewMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('view')}>
          <Eye size={14} style={{ marginRight: '6px' }} />
          View
        </span>
        <div className={styles.menuContent}>
          <CustomTooltip title="View staged changes diff">
            <button
              className={styles.menuItem}
              onClick={(e) => {
                e.stopPropagation()
                handleShowDiff()
              }}
            >
              Cached Diff
            </button>
          </CustomTooltip>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'merge' ? styles.active : ''}`}
        ref={mergeMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('merge')}>
          <GitMerge size={14} style={{ marginRight: '6px' }} />
          Merge
        </span>
        <div className={styles.menuContent}>
          <CustomTooltip
            title={
              hasMergeInProgress ? 'Abort the current merge operation' : 'No merge in progress'
            }
          >
            <button
              className={`${styles.menuItem} ${styles.mergeAbortBtn} ${hasMergeInProgress ? styles.active : styles.disabled}`}
              onClick={(e) => {
                e.stopPropagation()
                handleMergeAbort()
                setActiveMenu(null)
              }}
              disabled={!hasMergeInProgress}
            >
              Abort Merge
            </button>
          </CustomTooltip>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'author' ? styles.active : ''}`}
        ref={authorMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('author')}>
          <User size={14} style={{ marginRight: '6px' }} />
          Author
        </span>
        <div className={styles.menuContent}>
          <div className={styles.authorField}>
            <label className={styles.authorLabel}>Name</label>
            <input
              type="text"
              className={styles.authorInput}
              value={authorDraft.name}
              placeholder="user.name"
              onChange={(e) => setAuthorDraft((prev) => ({ ...prev, name: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className={styles.authorField}>
            <label className={styles.authorLabel}>Email</label>
            <input
              type="email"
              className={styles.authorInput}
              value={authorDraft.email}
              placeholder="user.email"
              onChange={(e) => setAuthorDraft((prev) => ({ ...prev, email: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveAuthor()
              }}
            />
          </div>
          <div className={styles.authorActions}>
            <button
              className={`${styles.menuItem} ${styles.authorSaveBtn}`}
              onClick={(e) => {
                e.stopPropagation()
                handleSaveAuthor()
              }}
              disabled={authorSaving}
            >
              {authorSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'prefixes' ? styles.active : ''}`}
        ref={prefixMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('prefixes')}>
          <Type size={14} style={{ marginRight: '6px' }} />
          Prefixes
        </span>
        <div className={styles.menuContent}>
          <div className={styles.prefixInputContainer}>
            <input
              type="text"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              placeholder="Add prefix..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddPrefix(e)}
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={handleAddPrefix}>
              <Plus size={14} />
            </button>
          </div>
          <PrefixList onRemove={handleRemovePrefix} />
        </div>
      </div>
      <DiffModal show={showDiffModal} diff={cachedDiff} onClose={handleCloseDiff} />
    </div>
  )
}
