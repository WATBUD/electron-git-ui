import React from 'react'
import { Tag } from 'lucide-react'
import styles from '../BranchList/BranchList.module.css'

/**
 * Single source of truth for tag "variant" classification.
 * Returns the CSS class + title text given the four tag sets.
 */
export const classifyTag = (tagName, { localOnlyTags, remoteOnlyTags, divergentTags }) => {
  const isDivergent = divergentTags?.includes(tagName)
  const isLocalOnly = localOnlyTags?.includes(tagName)
  const isRemoteOnly = remoteOnlyTags?.includes(tagName)
  const variant = isDivergent
    ? styles.divergent
    : isRemoteOnly
      ? styles.remoteOnly
      : isLocalOnly
        ? styles.localOnly
        : styles.synced
  const title = isDivergent
    ? `${tagName} (Divergent — local & remote point to different commits)`
    : isRemoteOnly
      ? `${tagName} (Remote only)`
      : isLocalOnly
        ? `${tagName} (Local only)`
        : `${tagName} (Synced)`
  return { variant, title, isDivergent, isLocalOnly, isRemoteOnly }
}

/**
 * Renders one tag pill. Use `inline` for the smaller variant under commit rows,
 * default size sits next to branch names.
 */
export const TagBadge = React.memo(function TagBadge({
  tag,
  localOnlyTags,
  remoteOnlyTags,
  divergentTags,
  inline = false,
  iconSize,
  onContextMenu,
  onClick,
  className: extraClassName = ''
}) {
  const { variant, title } = classifyTag(tag, {
    localOnlyTags,
    remoteOnlyTags,
    divergentTags
  })
  const baseClass = inline ? styles.commitTag : styles.tagBadge
  return (
    <span
      className={`${baseClass} ${variant} ${extraClassName}`}
      title={title}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      <Tag size={iconSize ?? (inline ? 8 : 9)} />
      {tag}
    </span>
  )
})

export default TagBadge
