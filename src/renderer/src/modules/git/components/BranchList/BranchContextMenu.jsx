import React, { useRef, useEffect } from 'react'
import { GitMerge, ArrowDownLeft, Edit3, Tag } from 'lucide-react'
import styles from './BranchList.module.css'

export const BranchContextMenu = ({
  show,
  x,
  y,
  branchName,
  currentBranch,
  onMerge,
  onCheckout,
  onRename,
  onCreateTag,
  onClose
}) => {
  const contextMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        onClose()
      }
    }

    if (show) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, onClose])

  if (!show) return null

  const isRemoteBranch = branchName?.includes('origin/')
  const isCurrentBranch = branchName === currentBranch

  return (
    <div
      ref={contextMenuRef}
      className={styles.contextMenu}
      style={{
        top: y,
        left: x
      }}
    >
      <div className={styles.contextMenuHeader}>
        {branchName?.replace('origin/', '')}
      </div>
      <div className={styles.contextMenuContent}>
        <button
          className={styles.contextMenuItem}
          onClick={() => {
            onMerge(branchName)
            onClose()
          }}
          disabled={isCurrentBranch}
        >
          <GitMerge size={14} />
          <span>Merge into {currentBranch}</span>
        </button>
        <button
          className={styles.contextMenuItem}
          onClick={() => {
            onCheckout(branchName)
            onClose()
          }}
          disabled={isCurrentBranch}
        >
          <ArrowDownLeft size={14} />
          <span>Checkout</span>
        </button>
        <button
          className={styles.contextMenuItem}
          onClick={() => {
            onRename(branchName)
            onClose()
          }}
          disabled={!branchName || isRemoteBranch}
        >
          <Edit3 size={14} />
          <span>Rename</span>
        </button>
        <button
          className={styles.contextMenuItem}
          onClick={() => {
            onCreateTag(branchName)
            onClose()
          }}
          disabled={isRemoteBranch}
        >
          <Tag size={14} />
          <span>Create Tag</span>
        </button>
      </div>
    </div>
  )
}
