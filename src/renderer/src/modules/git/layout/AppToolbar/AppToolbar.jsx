import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  toggleFooter,
  refreshTags,
  abortMerge,
  checkMergeInProgress,
  getCachedDiff,
  clearCachedDiff
} from '../../store/git'
import { DiffModal } from '../../../../shared/components/DiffModal'
import styles from './AppToolbar.module.css'

export const AppToolbar = () => {
  const [activeMenu, setActiveMenu] = useState(null)
  const mergeMenuRef = useRef(null)
  const tagsMenuRef = useRef(null)
  const viewMenuRef = useRef(null)
  const dispatch = useDispatch()
  const { showFooter, isRefreshingTags, hasMergeInProgress, cachedDiff } = useSelector((state) => ({
    showFooter: state.git.showFooter,
    isRefreshingTags: state.git.isRefreshingTags,
    hasMergeInProgress: state.git.hasMergeInProgress,
    cachedDiff: state.git.cachedDiff
  }))
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
        !viewMenuRef.current.contains(event.target)
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
  }, [mergeMenuRef, tagsMenuRef, viewMenuRef])

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
      <DiffModal show={showDiffModal} diff={cachedDiff} onClose={handleCloseDiff} />
    </div>
  )
}
