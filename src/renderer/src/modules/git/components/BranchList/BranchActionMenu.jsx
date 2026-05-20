/* eslint-disable react/prop-types, no-unused-vars */
import React, { useRef, useState } from 'react'
import { GitMerge, ArrowDownLeft, Edit3, Tag, ChevronRight, Trash2 } from 'lucide-react'
import { TagSubmenu } from '../Tag/TagSubmenu'
import { useClickOutsideMenu } from './menuShared'
import styles from './BranchList.module.css'

/**
 * Context menu for `type='branch'`.
 * Shows merge / checkout / rename / create tag / delete + nested tag submenus
 * for any tags pointing at the branch tip.
 */
export const BranchActionMenu = ({
  show,
  x,
  y,
  target: branchName,
  currentBranch,
  onMerge,
  onCheckout,
  onRename,
  onCreateTag,
  onClose,
  branchTags = [],
  localOnlyTags = [],
  remoteOnlyTags = [],
  divergentTags = [],
  onRefreshCommits,
  onRequestDeleteTag,
  onRequestDeleteBranch,
  onPushTag
}) => {
  const menuRef = useRef(null)
  const submenuRef = useRef(null)
  const [hoveredTag, setHoveredTag] = useState(null)
  const [submenuPos, setSubmenuPos] = useState({ top: 0, left: 0 })

  useClickOutsideMenu({
    show,
    primaryRef: menuRef,
    submenuRef,
    onClose: () => {
      setHoveredTag(null)
      onClose?.()
    }
  })

  if (!show) return null

  const isRemoteBranch = branchName?.includes('origin/')
  const isCurrentBranch = branchName === currentBranch

  const handleTagHover = (e, tagName) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSubmenuPos({ top: rect.top, left: rect.right })
    setHoveredTag(tagName)
  }

  return (
    <>
      <div ref={menuRef} className={styles.contextMenu} style={{ top: y, left: x }}>
        <div className={styles.contextMenuHeader}>{branchName?.replace('origin/', '')}</div>
        <div className={styles.contextMenuContent}>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onMerge?.(branchName)
              onClose?.()
            }}
            disabled={isCurrentBranch}
            onMouseEnter={() => setHoveredTag(null)}
          >
            <GitMerge size={14} />
            <span>Merge into {currentBranch}</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onCheckout?.(branchName)
              onClose?.()
            }}
            disabled={isCurrentBranch}
            onMouseEnter={() => setHoveredTag(null)}
          >
            <ArrowDownLeft size={14} />
            <span>Checkout</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onRename?.(branchName)
              onClose?.()
            }}
            disabled={!branchName || isRemoteBranch}
            onMouseEnter={() => setHoveredTag(null)}
          >
            <Edit3 size={14} />
            <span>Rename</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onCreateTag?.(branchName)
              onClose?.()
            }}
            disabled={isRemoteBranch}
            onMouseEnter={() => setHoveredTag(null)}
          >
            <Tag size={14} />
            <span>Create Tag</span>
          </button>

          {!isCurrentBranch && (
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onClose?.()
                onRequestDeleteBranch?.(branchName, isRemoteBranch)
              }}
              style={{ color: '#ff3b30' }}
              onMouseEnter={() => setHoveredTag(null)}
            >
              <Trash2 size={14} />
              <span>Delete Branch</span>
            </button>
          )}

          {branchTags && branchTags.length > 0 && (
            <>
              <div className={styles.contextMenuDivider} />
              {branchTags.map((tagName) => (
                <button
                  key={tagName}
                  className={`${styles.contextMenuItem} ${styles.hasSubmenu}`}
                  onMouseEnter={(e) => handleTagHover(e, tagName)}
                >
                  <Tag size={14} />
                  <span>{tagName}</span>
                  <ChevronRight size={14} className={styles.submenuArrow} />
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {hoveredTag && (
        <TagSubmenu
          tagName={hoveredTag}
          position={submenuPos}
          submenuRef={submenuRef}
          localOnlyTags={localOnlyTags}
          remoteOnlyTags={remoteOnlyTags}
          divergentTags={divergentTags}
          onClose={() => {
            setHoveredTag(null)
            onClose?.()
          }}
          onPushTag={onPushTag}
          onRequestDeleteTag={onRequestDeleteTag}
          onRefreshCommits={onRefreshCommits}
        />
      )}
    </>
  )
}

export default BranchActionMenu
