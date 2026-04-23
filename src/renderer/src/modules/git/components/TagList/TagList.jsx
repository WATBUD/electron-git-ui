import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Tag as TagIcon, ChevronDown } from 'lucide-react'
import { RefreshButton } from '../../../../shared/components/RefreshButton'
import { SearchInput } from '../../../../shared/components/SearchInput'
import { TagItem } from './TagItem'
import { loadTags, deleteTag } from '../../store/git/gitThunks'
import styles from './TagList.module.css'

export const TagList = ({ onTagClick }) => {
  const dispatch = useDispatch()
  const { localTags, remoteTags, tagsLoading, repoPath } = useSelector((state) => state.git)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLocalCollapsed, setIsLocalCollapsed] = useState(false)
  const [isRemoteCollapsed, setIsRemoteCollapsed] = useState(false)
  const [activeTag, setActiveTag] = useState(null)

  useEffect(() => {
    if (repoPath) {
      dispatch(loadTags())
    }
  }, [repoPath, dispatch])

  // Auto-expand sections when searching
  useEffect(() => {
    if (searchTerm) {
      setIsLocalCollapsed(false)
      setIsRemoteCollapsed(false)
    }
  }, [searchTerm])

  const handleRefresh = () => {
    dispatch(loadTags())
  }

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
  const filteredRemoteTags = filterTags(remoteTags)

  return (
    <div className={styles.tagListPanel}>
      <div className={styles.tagListHeader}>
        <div className={styles.headerTitle}>
          <TagIcon size={18} />
          <span>Tags</span>
        </div>
        <RefreshButton
          onClick={handleRefresh}
          disabled={tagsLoading}
          title="Refresh tags"
          text="Refresh"
        />
      </div>

      <div className={styles.tagListContainer}>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tags..."
          customStyle={{ margin: '12px 16px' }}
        />

        <div className={styles.tagListContent}>
          {/* Local Tags */}
          <div className={styles.tagSection}>
            <div
              className={styles.sectionHeader}
              onClick={() => setIsLocalCollapsed(!isLocalCollapsed)}
            >
              <ChevronDown
                className={`${styles.chevronIcon} ${isLocalCollapsed ? styles.collapsed : ''}`}
                size={14}
              />
              <h3>LOCAL</h3>
              <span className={styles.tagCount}>
                {localTags.length}
              </span>
            </div>
            {!isLocalCollapsed && (
              <div className={styles.tagGroup}>
                {filteredLocalTags.length > 0 ? (
                  filteredLocalTags.map((tag) => (
                    <TagItem
                      key={`local-${tag}`}
                      tag={tag}
                      isRemote={false}
                      isActive={activeTag?.tag === tag && !activeTag?.isRemote}
                      onClick={handleTagClick}
                      onDelete={handleDeleteTag}
                    />
                  ))
                ) : (
                  <div className={styles.noTags}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {searchTerm ? 'No matching local tags' : 'No local tags'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remote Tags */}
          <div className={styles.tagSection}>
            <div
              className={styles.sectionHeader}
              onClick={() => setIsRemoteCollapsed(!isRemoteCollapsed)}
            >
              <ChevronDown
                className={`${styles.chevronIcon} ${isRemoteCollapsed ? styles.collapsed : ''}`}
                size={14}
              />
              <h3>REMOTE</h3>
              <span className={styles.tagCount}>
                {remoteTags.length}
              </span>
            </div>
            {!isRemoteCollapsed && (
              <div className={styles.tagGroup}>
                {filteredRemoteTags.length > 0 ? (
                  filteredRemoteTags.map((tag) => (
                    <TagItem
                      key={`remote-${tag}`}
                      tag={tag}
                      isRemote={true}
                      isActive={activeTag?.tag === tag && activeTag?.isRemote}
                      onClick={handleTagClick}
                      onDelete={handleDeleteTag}
                    />
                  ))
                ) : (
                  <div className={styles.noTags}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {searchTerm ? 'No matching remote tags' : 'No remote tags'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TagList
