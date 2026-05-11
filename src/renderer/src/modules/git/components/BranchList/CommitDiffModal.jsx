import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { ChevronDown, X, FileCode } from 'lucide-react'
import { getCommitDiff } from '../../store/git/gitThunks'
import styles from './CommitDiffModal.module.css'

// Split `git show` output into per-file sections so each can be collapsed.
const parseDiff = (diffText) => {
  const text = diffText || ''
  if (!text) return { header: '', files: [] }

  const lines = text.split('\n')
  const fileStartIdxs = []
  lines.forEach((line, idx) => {
    if (line.startsWith('diff --git ')) fileStartIdxs.push(idx)
  })

  const header = fileStartIdxs.length > 0
    ? lines.slice(0, fileStartIdxs[0]).join('\n')
    : text

  const files = fileStartIdxs.map((startIdx, i) => {
    const endIdx = i + 1 < fileStartIdxs.length ? fileStartIdxs[i + 1] : lines.length
    const sectionLines = lines.slice(startIdx, endIdx)
    // Path: prefer "+++ b/<path>" (handles renames; "/dev/null" means deletion)
    let path = null
    for (const l of sectionLines) {
      if (l.startsWith('+++ b/')) {
        path = l.slice(6)
        break
      }
    }
    if (!path) {
      // Fallback: parse from "diff --git a/<x> b/<y>"
      const m = sectionLines[0].match(/^diff --git a\/(.+?) b\/(.+)$/)
      if (m) path = m[2]
    }
    return { path: path || `file-${i}`, lines: sectionLines }
  })

  return { header, files }
}

const diffLineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---')) return styles.diffMeta
  if (line.startsWith('@@')) return styles.diffHunk
  if (line.startsWith('+')) return styles.diffAdd
  if (line.startsWith('-')) return styles.diffDel
  if (
    line.startsWith('diff ') ||
    line.startsWith('index ') ||
    line.startsWith('new file') ||
    line.startsWith('deleted file') ||
    line.startsWith('similarity ') ||
    line.startsWith('rename ')
  ) {
    return styles.diffMeta
  }
  return styles.diffContext
}

export const CommitDiffModal = ({ commit, onClose }) => {
  const dispatch = useDispatch()
  const [files, setFiles] = useState([])
  const [diff, setDiff] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [collapsedFiles, setCollapsedFiles] = useState(new Set())

  // Load diff whenever the target commit changes.
  useEffect(() => {
    if (!commit) return
    let cancelled = false

    setCollapsedFiles(new Set())
    setFiles([])
    setDiff('')
    setError(null)
    setLoading(true)

    dispatch(getCommitDiff(commit.hash))
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setFiles(result.data?.files || [])
        setDiff(result.data?.diff || '')
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError((typeof err === 'string' ? err : err?.message) || 'Failed to load commit diff')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [commit, dispatch])

  const parsedDiffFiles = useMemo(() => parseDiff(diff), [diff])

  const toggleFile = useCallback((path) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  if (!commit) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.macModal} ${styles.commitDiffModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.commitDiffHeader}>
          <div className={styles.commitDiffTitleRow}>
            <FileCode size={16} />
            <h3 className={styles.commitDiffHash} title={commit.hash}>
              {commit.hash || commit.shortHash}
            </h3>
            <button
              className={styles.commitDiffClose}
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <span className={styles.commitDiffSubject}>{commit.message}</span>
        </div>
        <div className={styles.commitDiffMeta}>
          <span>{commit.author}</span>
          <span>{commit.date}</span>
        </div>
        <div className={styles.commitDiffBody}>
          {loading ? (
            <div className={styles.commitDiffLoading}>Loading...</div>
          ) : error ? (
            <div className={styles.commitDiffError}>{error}</div>
          ) : (
            <>
              {parsedDiffFiles.header && (
                <pre className={`${styles.commitDiffContent} ${styles.commitDiffMessage}`}>
                  {parsedDiffFiles.header.split('\n').map((line, idx) => (
                    <div key={idx} className={styles.diffMeta}>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              )}
              {parsedDiffFiles.files.map((f) => {
                const meta = files.find(
                  (it) => it.file === f.path || it.oldFile === f.path
                )
                const status = meta?.status
                const isCollapsed = collapsedFiles.has(f.path)
                return (
                  <div key={f.path} className={styles.commitDiffFileSection}>
                    <button
                      type="button"
                      className={styles.commitDiffFileHeader}
                      onClick={() => toggleFile(f.path)}
                    >
                      <ChevronDown
                        size={12}
                        className={`${styles.chevronIcon} ${isCollapsed ? styles.collapsed : ''}`}
                      />
                      {status && (
                        <span
                          className={`${styles.commitDiffFileStatus} ${
                            styles[`status_${status.charAt(0)}`] || ''
                          }`}
                        >
                          {status}
                        </span>
                      )}
                      <span className={styles.commitDiffFileName}>
                        {meta?.oldFile ? `${meta.oldFile} → ${meta.file}` : f.path}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <pre className={styles.commitDiffContent}>
                        {f.lines.map((line, idx) => (
                          <div key={idx} className={diffLineClass(line)}>
                            {line || ' '}
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommitDiffModal
