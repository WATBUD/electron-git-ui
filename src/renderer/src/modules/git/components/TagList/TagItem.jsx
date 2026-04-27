import React from 'react'
import { Copy, Tag, Trash2, Upload } from 'lucide-react'
import { CopyButton } from '../../../../shared/components/CopyButton'
import styles from './TagList.module.css'

export const TagItem = ({ tag, isRemote, isActive, onClick, onDelete, isLocalOnly }) => {
  return (
    <div
      className={`${styles.tagItem} ${isActive ? styles.active : ''}`}
      onClick={() => onClick(tag, isRemote)}
    >
      <div className={styles.tagMain}>
        <Tag size={14} className={styles.itemIcon} />
        <span className={styles.tagNameText}>{tag}</span>
        {isLocalOnly && (
          <span className={styles.localOnlyBadge} title="Local only (not pushed to remote)">
            <Upload size={10} />
            Local
          </span>
        )}
      </div>
      <div className={styles.tagActions}>
        <CopyButton textToCopy={tag} size={12} showCopiedText={false} />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(tag, isRemote)
          }}
          className={styles.deleteTagBtn}
          title={`Delete ${isRemote ? 'remote' : 'local'} tag`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
