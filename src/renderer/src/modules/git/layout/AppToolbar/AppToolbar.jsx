import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  toggleFooter,
  refreshTags,
  abortMerge,
  checkMergeInProgress,
  getCachedDiff,
  clearCachedDiff,
  addPrefix,
  removePrefix,
  toggleSelectedPrefix
} from '../../store/git'
import { DiffModal } from '../../../../shared/components/DiffModal'
import { CopyButton } from '../../../../shared/components/CopyButton'
import styles from './AppToolbar.module.css'
import { Trash2, Plus, Check } from 'lucide-react'

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
        <CopyButton textToCopy={prefix} title="Copy prefix" size={12} showCopiedText={false} />
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
  const tagsMenuRef = useRef(null)
  const viewMenuRef = useRef(null)
  const prefixMenuRef = useRef(null)
  const [newPrefix, setNewPrefix] = useState('')
  const dispatch = useDispatch()
  const showFooter = useSelector((state) => state.git.showFooter)
  const isRefreshingTags = useSelector((state) => state.git.isRefreshingTags)
  const hasMergeInProgress = useSelector((state) => state.git.hasMergeInProgress)
  const cachedDiff = useSelector((state) => state.git.cachedDiff)
  const [showDiffModal, setShowDiffModal] = useState(false)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        mergeMenuRef.current &&
        !mergeMenuRef.current.contains(event.target) &&
        tagsMenuRef.current &&
        !tagsMenuRef.current.contains(event.target) &&
        viewMenuRef.current &&
        !viewMenuRef.current.contains(event.target) &&
        prefixMenuRef.current &&
        !prefixMenuRef.current.contains(event.target)
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
  }, [mergeMenuRef, tagsMenuRef, viewMenuRef, prefixMenuRef])

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const handleRefreshTags = () => {
    if (isRefreshingTags) return
    dispatch(refreshTags())
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

  return (
    <div className={styles.appToolbar}>
      <div className={styles.toolbarSection}>
        <div className={styles.toolbarMenu}>
          <label className={styles.toggleSwitch}>
            <input type="checkbox" checked={showFooter} onChange={() => dispatch(toggleFooter())} />
            <span className={styles.toggleCheckbox}></span>
            <span className={styles.toggleLabel}>Show History</span>
          </label>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'view' ? styles.active : ''}`}
        ref={viewMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('view')}>
          View
        </span>
        <div className={styles.menuContent}>
          <button
            className={styles.menuItem}
            onClick={(e) => {
              e.stopPropagation()
              handleShowDiff()
            }}
            title="View staged changes diff"
          >
            Cached Diff
          </button>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'merge' ? styles.active : ''}`}
        ref={mergeMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('merge')}>
          Merge
        </span>
        <div className={styles.menuContent}>
          <button
            className={`${styles.menuItem} ${styles.mergeAbortBtn} ${hasMergeInProgress ? styles.active : styles.disabled}`}
            onClick={(e) => {
              e.stopPropagation()
              handleMergeAbort()
              setActiveMenu(null)
            }}
            disabled={!hasMergeInProgress}
            title={
              hasMergeInProgress ? 'Abort the current merge operation' : 'No merge in progress'
            }
          >
            Abort Merge
          </button>
        </div>
      </div>

      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'tags' ? styles.active : ''}`}
        ref={tagsMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('tags')}>
          Tags
        </span>
        <div className={styles.menuContent}>
          <button
            className={`${styles.menuItem} ${styles.refreshTagsBtn} ${isRefreshingTags ? styles.refreshing : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              handleRefreshTags()
              setActiveMenu(null)
            }}
            disabled={isRefreshingTags}
            title="Refresh tags from remote"
          >
            {isRefreshingTags ? 'Refreshing...' : 'Refresh Tags'}
          </button>
        </div>
      </div>
      <div
        className={`${styles.toolbarMenu} ${activeMenu === 'prefixes' ? styles.active : ''}`}
        ref={prefixMenuRef}
      >
        <span className={styles.menuLabel} onClick={() => toggleMenu('prefixes')}>
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
