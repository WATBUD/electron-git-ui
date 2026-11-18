/* eslint-disable react/prop-types */
import React, { useCallback } from 'react'
import { Clock, GitBranch } from 'lucide-react'
import { formatRelativeTime, formatAbsoluteTime } from '../../../../shared/utils/relativeTime'
import { TagBadge } from '../Tag'
import tagStyles from '../Tag/Tag.module.css'
import { commitIndentStyle } from './branchTree'
import styles from './BranchList.module.css'

// Dot border colour on a commit row (one colour only, first match wins):
//   pink  = committed locally but not pushed yet
//   gold  = where this branch's local tip / HEAD is
//   blue  = the pushed point (upstream branch tip)
const commitDotClass = (commit, branch) => {
  if (commit.unpushed) return styles.commitDotUnpushed
  if (commit.isHead || commit.branches?.local?.includes(branch)) return styles.commitDotHead
  if (commit.isUpstreamTip) return styles.commitDotPushed
  return ''
}

// Tooltip explaining what the dot on a commit row means.
const commitDotTitle = (commit, branch) => {
  if (commit.unpushed) return '尚未 push：這個 commit 只存在本地，還沒推到遠端'
  if (commit.isHead) return '目前所在 (HEAD)：你現在 checkout 的位置，已 push'
  if (commit.branches?.local?.includes(branch)) {
    return `本地最新點：本地 ${branch} 目前指到這裡，已 push`
  }
  if (commit.isUpstreamTip) return '已 push 的位置：遠端分支目前指到這個 commit'
  if (commit.unpulled) return '遠端新 commit：已在遠端，本地還沒 pull'
  return '歷史 commit'
}

/**
 * One commit line inside an expanded branch.
 *
 * Wrapped in React.memo: it only re-renders when one of its own props changes
 * (shallow compare). That only works if the parent passes STABLE props:
 *   - `commit` objects come from the branchCommits state (same ref until reloaded)
 *   - handlers (`onView`, `onContextMenu`, `onTip*`) are useCallback with stable deps
 *   - the tag arrays are the same Redux array refs between renders
 * The row builds its own per-commit closures from `commit`, so the parent never
 * has to create a new `() => handle(commit)` for every row on every render.
 */
const CommitRowImpl = ({
  commit,
  branch,
  depth,
  commitDisplay,
  localOnlyTags,
  remoteOnlyTags,
  divergentTags,
  onView,
  onContextMenu,
  onTipShow,
  onTipMove,
  onTipHide
}) => {
  const handleClick = useCallback(() => {
    onTipHide()
    onView(commit)
  }, [onTipHide, onView, commit])

  const handleContextMenu = useCallback(
    (e) => {
      onTipHide()
      onContextMenu(e, 'commit', commit)
    },
    [onTipHide, onContextMenu, commit]
  )

  const handleMouseEnter = useCallback(
    (e) => onTipShow(e, commitDotTitle(commit, branch)),
    [onTipShow, commit, branch]
  )

  const info = commit.branches
  const branchBadges = []
  if (commitDisplay.branches && info) {
    ;(info.local || []).forEach((b) =>
      branchBadges.push({ name: b, isRemote: false, isCurrent: b === branch })
    )
    ;(info.remote || []).forEach((b) =>
      branchBadges.push({ name: b, isRemote: true, isCurrent: false })
    )
  }

  return (
    <div
      className={styles.commitItem}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseMove={onTipMove}
      onMouseLeave={onTipHide}
      style={{ cursor: 'pointer', ...commitIndentStyle(depth) }}
    >
      <div className={`${styles.commitDot} ${commitDotClass(commit, branch)}`} />
      <div className={styles.commitDetails}>
        <div className={styles.commitMeta}>
          {commitDisplay.hash && <span className={styles.commitHash}>{commit.shortHash}</span>}
          {commitDisplay.author && <span className={styles.commitAuthor}>{commit.author}</span>}
          {commitDisplay.date && commit.date && (
            <span className={styles.commitDate} title={formatAbsoluteTime(commit.date)}>
              <Clock size={11} />
              {formatRelativeTime(commit.date)}
            </span>
          )}
          {commitDisplay.tags && commit.tags.length > 0 && (
            <div className={tagStyles.commitTags}>
              {commit.tags.map((tag) => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  inline
                  localOnlyTags={localOnlyTags}
                  remoteOnlyTags={remoteOnlyTags}
                  divergentTags={divergentTags}
                />
              ))}
            </div>
          )}
          {branchBadges.length > 0 && (
            <div className={styles.commitBranches}>
              {branchBadges.map((b) => (
                <span
                  key={(b.isRemote ? 'r:' : 'l:') + b.name}
                  className={`${styles.commitBranchBadge} ${b.isRemote ? styles.commitBranchRemote : styles.commitBranchLocal} ${b.isCurrent ? styles.commitBranchCurrent : ''}`}
                  title={`${b.isCurrent ? 'Currently expanded — ' : ''}Tip of ${b.isRemote ? 'remote' : 'local'} branch: ${b.name}`}
                >
                  <GitBranch size={10} />
                  {b.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {commitDisplay.message && <div className={styles.commitMessage}>{commit.message}</div>}
      </div>
    </div>
  )
}

export const CommitRow = React.memo(CommitRowImpl)
export default CommitRow
