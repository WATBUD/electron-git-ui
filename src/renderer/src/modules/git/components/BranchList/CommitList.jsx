/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import { CommitRow } from './CommitRow'
import styles from './BranchList.module.css'

// A branch can hold up to BRANCH_COMMITS_LIMIT (1000) commits. Mounting them all
// the moment a branch expands makes the expand itself slow, and every later
// re-render of the list pays for all of them.
//
// Commit rows have VARIABLE height (tags / branch badges wrap onto extra lines),
// so a fixed-row-height window like the REMOTE list isn't safe here. Instead:
//   1. render in chunks — only the first INITIAL_COUNT rows are mounted, and a
//      sentinel at the bottom mounts CHUNK_SIZE more as it scrolls into view;
//   2. rows use `content-visibility: auto` (see .commitItem) so rows that are
//      mounted but off-screen skip layout and paint.
const INITIAL_COUNT = 40
const CHUNK_SIZE = 40

export const CommitList = ({ commits, ...rowProps }) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef(null)
  const total = commits.length
  const hasMore = visibleCount < total

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + CHUNK_SIZE, total))
        }
      },
      // Start loading a little before the sentinel is actually visible.
      { rootMargin: '300px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
    // Re-subscribe after each chunk so a sentinel that is STILL visible
    // (short rows, tall viewport) triggers the next chunk too.
  }, [hasMore, total, visibleCount])

  return (
    <>
      {commits.slice(0, visibleCount).map((commit) => (
        <CommitRow key={commit.hash} commit={commit} {...rowProps} />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className={styles.commitListMore}>
          {visibleCount} / {total}
        </div>
      )}
    </>
  )
}

export default CommitList
