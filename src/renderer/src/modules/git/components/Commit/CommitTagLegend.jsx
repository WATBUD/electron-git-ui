import React from 'react'
import { Tag } from 'lucide-react'
import { CommitDisplayOptionsMenu } from './CommitDisplayOptions'
import { TEXT_SIZE, ICON_SIZE } from './constants'
import styles from './CommitDisplayOptions.module.css'

export const CommitTagLegend = ({ commitDisplay, toggleCommitDisplay, style }) => {
  return (
    <div className={styles.tagLegend} style={style}>
      <CommitDisplayOptionsMenu options={commitDisplay} toggle={toggleCommitDisplay} />
      <span className={styles.legendItem} style={{ gap: `${TEXT_SIZE / 3}px` }}>
        <span
          className={`${styles.legendBadge} ${styles.localOnly}`}
          style={{
            width: `${ICON_SIZE + 2}px`,
            height: `${ICON_SIZE + 2}px`
          }}
        >
          <Tag size={ICON_SIZE - 4} />
        </span>
        <span className={styles.legendText} style={{ fontSize: `${TEXT_SIZE - 2}px` }}>
          Local only
        </span>
      </span>
      <span className={styles.legendItem} style={{ gap: `${TEXT_SIZE / 3}px` }}>
        <span
          className={`${styles.legendBadge} ${styles.remoteOnly}`}
          style={{
            width: `${ICON_SIZE + 2}px`,
            height: `${ICON_SIZE + 2}px`
          }}
        >
          <Tag size={ICON_SIZE - 4} />
        </span>
        <span className={styles.legendText} style={{ fontSize: `${TEXT_SIZE - 2}px` }}>
          Remote only
        </span>
      </span>
      <span className={styles.legendItem} style={{ gap: `${TEXT_SIZE / 3}px` }}>
        <span
          className={`${styles.legendBadge} ${styles.synced}`}
          style={{
            width: `${ICON_SIZE + 2}px`,
            height: `${ICON_SIZE + 2}px`
          }}
        >
          <Tag size={ICON_SIZE - 4} />
        </span>
        <span className={styles.legendText} style={{ fontSize: `${TEXT_SIZE - 2}px` }}>
          Synced
        </span>
      </span>
      <span className={styles.legendItem} style={{ gap: `${TEXT_SIZE / 3}px` }}>
        <span
          className={`${styles.legendBadge} ${styles.divergent}`}
          style={{
            width: `${ICON_SIZE + 2}px`,
            height: `${ICON_SIZE + 2}px`
          }}
        >
          <Tag size={ICON_SIZE - 4} />
        </span>
        <span className={styles.legendText} style={{ fontSize: `${TEXT_SIZE - 2}px` }}>
          Divergent
        </span>
      </span>
    </div>
  )
}

export default CommitTagLegend
