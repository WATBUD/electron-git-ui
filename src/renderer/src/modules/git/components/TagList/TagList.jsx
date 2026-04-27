import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Tag as TagIcon } from 'lucide-react'
import { SearchInput } from '../../../../shared/components/SearchInput'
import { TagItem } from './TagItem'
import { loadTags, deleteTag } from '../../store/git/gitThunks'
import styles from './TagList.module.css'

export const TagList = ({ onTagClick }) => {
  const dispatch = useDispatch()
  const { localTags, remoteTags, localOnlyTags, tagsLoading, repoPath } = useSelector((state) => state.git)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTag, setActiveTag] = useState(null)

  useEffect(() => {
    if (repoPath) {
      dispatch(loadTags())
    }
  }, [repoPath, dispatch])

  const handleDeleteTag = (tagName, isRemote) => {
    if (confirm(`Are you sure you want to delete the ${isRemote ? 'remote' : 'local'} tag "${tagName}"?`)) {
      dispatch(deleteTag({ tagName, isRemote })).then(() => {
        dispatch(loadTags())
      })
    }
  }

  const filterTags = (tags) => {
    return tags.filter((tag) =>
      searchTerm === '' || tag.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleTagClick = (tag, isRemote) => {
    setActiveTag({ tag, isRemote })
    if (onTagClick) {
      onTagClick(tag, isRemote)
    }
  }

  const filteredLocalTags = filterTags(localTags)

  return (
    <div className={styles.tagListPanel}>
      <div className={styles.tagListHeader}>
        <div className={styles.headerTitle}>
          <TagIcon size={18} />
          <span>Tags</span>
        </div>
      </div>

      <div className={styles.tagListContainer}>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tags..."
          customStyle={{ marginTop: '10px', marginBottom: '10px' }}
        />

        <div className={styles.tagListContent}>
          <div className={styles.tagGroup}>
            {filteredLocalTags.length > 0 ? (
              filteredLocalTags.map((tag) => (
                <TagItem
                  key={`local-${tag}`}
                  tag={tag}
                  isRemote={false}
                  isActive={activeTag?.tag === tag && !activeTag?.isRemote}
                  isLocalOnly={localOnlyTags.includes(tag)}
                  onClick={handleTagClick}
                  onDelete={handleDeleteTag}
                />
              ))
            ) : (
              <div className={styles.noTags}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'No matching tags' : 'No tags'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TagList
